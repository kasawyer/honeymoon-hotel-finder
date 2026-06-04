# app/services/streaming_hotel_aggregator.rb
#
# Like HotelAggregator but streams progress events via SSE.
# Each stage sends a progress update so the frontend can show real-time status.
#
class StreamingHotelAggregator < HotelAggregator
  def initialize(location:, check_in: nil, check_out: nil, keywords: nil, stream:)
    super(location: location, check_in: check_in, check_out: check_out, keywords: keywords)
    @stream = stream
  end

  def search
    # 1. Check Redis cache
    cached = HotelCache.get_search(location: @location, keywords: @keywords)
    if cached
      send_event("progress", { stage: "cache_hit", message: "Found cached results", percent: 100 })
      send_event("complete", { hotels: cached, count: cached.length, cached: true })
      return
    end

    # 2. Try to acquire search lock
    lock_key = "lock:search:#{@location.downcase.strip}:#{@keywords.map(&:downcase).sort.join(',')}"
    acquired = REDIS.set(lock_key, "#{Process.pid}", nx: true, ex: 120)

    if !acquired
      # Another request is already searching — wait for cache
      send_event("progress", { stage: "waiting", message: "Another search in progress, waiting for results...", percent: 5 })

      cached = wait_for_cached_results
      if cached
        send_event("progress", { stage: "cache_hit", message: "Found results", percent: 100 })
        send_event("complete", { hotels: cached, count: cached.length, cached: true })
        return
      end

      # Timed out — proceed with our own search
      REDIS.set(lock_key, "#{Process.pid}", ex: 120)
    end

    begin
      run_streaming_search
    ensure
      REDIS.del(lock_key) rescue nil
    end
  end

  private

  def wait_for_cached_results
    elapsed = 0
    while elapsed < 90
      sleep(1)
      elapsed += 1

      cached = HotelCache.get_search(location: @location, keywords: @keywords)
      return cached if cached

      send_event("progress", {
        stage: "waiting",
        message: "Waiting for search results (#{elapsed}s)...",
        percent: [ 5 + elapsed, 50 ].min
      })
    end
    nil
  end

  def run_streaming_search
    # === PHASE 1: Fast initial results ===
    send_event("progress", { stage: "tripadvisor", message: "Searching TripAdvisor...", percent: 5 })
    ta_hotels_page1 = fetch_tripadvisor(page: 1)
    provider_errors = []

    if ta_hotels_page1.any?
      ta_hotels_phase1 = ta_hotels_page1.first(MAX_HOTELS_PHASE1)
      send_event("progress", {
        stage: "tripadvisor_done",
        message: "Found #{ta_hotels_phase1.length} hotels on TripAdvisor",
        percent: 15
      })

      merged, enrich_errors = enrich_hotels_with_progress(ta_hotels_phase1, start_percent: 15, end_percent: 85)
      provider_errors.concat(enrich_errors)
    else
      provider_errors << "TripAdvisor"
      send_event("progress", {
        stage: "tripadvisor_fallback",
        message: "TripAdvisor unavailable, searching Google Places...",
        percent: 10
      })
      merged = fetch_google_fallback_with_progress
    end

    if merged.empty?
      send_event("complete", { hotels: [], count: 0, cached: false, provider_errors: provider_errors })
      return
    end

    # Sort and send Phase 1 results
    sorted = merged.sort_by { |h| [ -(h[:combined_rating] || 0), (h[:price_per_night] || Float::INFINITY) ] }

    # Cache Phase 1
    if sorted.any?
      begin
        HotelCache.set_search(location: @location, keywords: @keywords, results: sorted)
      rescue => e
        Rails.logger.error("[StreamingAggregator] Cache write failed: #{e.message}")
      end
    end

    send_event("progress", { stage: "done", message: "Search complete!", percent: 100 })
    send_event("complete", {
      hotels: sorted,
      count: sorted.length,
      cached: false,
      provider_errors: provider_errors.uniq,
      degraded_providers: ApiUsageTracker.degraded_providers,
      has_more: ta_hotels_page1.any?
    })

    # === PHASE 2: Background expansion ===
    if ta_hotels_page1.any?
      expand_results(sorted, provider_errors)
    end
  end

  def expand_results(phase1_results, provider_errors)
    send_event("progress", { stage: "expanding", message: "Finding more hotels...", percent: 0 })

    existing_names = phase1_results.map { |h| h[:name].downcase }
    all_additional = []

    [ 2, 3 ].each do |page|
      begin
        ta_hotels = fetch_tripadvisor(page: page)
        break if ta_hotels.empty?

        # Deduplicate against Phase 1
        new_hotels = ta_hotels.reject { |h| existing_names.include?(h[:name].downcase) }
        break if new_hotels.empty?

        send_event("progress", {
          stage: "expanding",
          message: "Enriching page #{page} hotels (#{new_hotels.length} new)...",
          percent: (page - 1) * 50
        })

        enriched, _ = enrich_hotels_with_progress(
          new_hotels.first(MAX_HOTELS_PHASE1),
          start_percent: 0,
          end_percent: 100,
          event_type: "expand_progress"
        )

        if enriched.any?
          sorted_new = enriched.sort_by { |h| [ -(h[:combined_rating] || 0), (h[:price_per_night] || Float::INFINITY) ] }
          all_additional.concat(sorted_new)
          existing_names.concat(sorted_new.map { |h| h[:name].downcase })

          send_event("more_results", {
            hotels: sorted_new,
            count: sorted_new.length,
            total_count: phase1_results.length + all_additional.length
          })
        end

        sleep(1) # Pause between pages
      rescue => e
        Rails.logger.error("[StreamingAggregator] Expand page #{page} failed: #{e.message}")
        break
      end
    end

    # Update cache with full results
    if all_additional.any?
      full_results = phase1_results + all_additional
      full_sorted = full_results.sort_by { |h| [ -(h[:combined_rating] || 0), (h[:price_per_night] || Float::INFINITY) ] }
      begin
        HotelCache.set_search(location: @location, keywords: @keywords, results: full_sorted)
        Rails.logger.info("[StreamingAggregator] Updated cache with #{full_sorted.length} total hotels")
      rescue => e
        Rails.logger.error("[StreamingAggregator] Cache update failed: #{e.message}")
      end
    end

    send_event("expansion_complete", {
      additional_count: all_additional.length,
      total_count: phase1_results.length + all_additional.length
    })
  rescue => e
    Rails.logger.error("[StreamingAggregator] Expansion failed: #{e.message}")
  end

  def enrich_hotels_with_progress(ta_hotels, start_percent: 20, end_percent: 95, event_type: "progress")
    results = []
    total = ta_hotels.length
    google_failures = 0
    booking_failures = 0
    percent_range = end_percent - start_percent

    ta_hotels.each_slice(3).with_index do |batch, batch_index|
      completed = batch_index * 3
      current_percent = start_percent + ((completed.to_f / total) * percent_range).round

      send_event(event_type, {
        stage: "enriching",
        message: "Checking Google & Booking.com (#{[ completed, total ].min}/#{total})...",
        percent: current_percent
      })

      threads = batch.map do |ta_hotel|
        Thread.new do
          google_data = lookup_google(ta_hotel[:name])
          booking_data = lookup_booking(ta_hotel[:name])
          google_failures += 1 unless google_data
          booking_failures += 1 unless booking_data
          build_merged_hotel(ta_hotel, google_data, booking_data)
        rescue => e
          Rails.logger.error("[StreamingAggregator] Enrich failed for #{ta_hotel[:name]}: #{e.message}")
          build_merged_hotel(ta_hotel, nil, nil)
        end
      end

      batch_results = threads.map { |t| t.join(15)&.value }.compact
      results.concat(batch_results)

      sleep(0.5)
    end

    errors = []
    errors << "Google" if total > 0 && google_failures > total / 2
    errors << "Booking.com" if total > 0 && booking_failures > total / 2

    [ results, errors ]
  end

  def fetch_google_fallback_with_progress
    service = GooglePlacesService.new

    send_event("progress", { stage: "google_geocode", message: "Finding location...", percent: 20 })
    geo = service.geocode(@location)
    return [] unless geo

    send_event("progress", { stage: "google_search", message: "Searching Google Places...", percent: 30 })
    google_hotels = service.search_hotels(
      latitude: geo[:latitude],
      longitude: geo[:longitude],
      keywords: @keywords
    ).first(MAX_HOTELS)

    send_event("progress", {
      stage: "google_done",
      message: "Found #{google_hotels.length} hotels, checking Booking.com...",
      percent: 40
    })

    results = []
    total = google_hotels.length

    google_hotels.each_with_index do |hotel, index|
      send_event("progress", {
        stage: "enriching",
        message: "Checking Booking.com (#{index + 1}/#{total})...",
        percent: 40 + ((index.to_f / total) * 55).round
      })

      booking_data = lookup_booking(hotel[:name])

      source_ratings = []
      sources = [ "google" ]

      if hotel[:rating].present?
        source_ratings << { source: "google", rating: hotel[:rating].to_f.round(1), count: hotel[:total_ratings] || 0 }
      end

      if booking_data&.dig(:rating).present?
        sources << "booking"
        source_ratings << { source: "booking", rating: booking_data[:rating].to_f.round(1), count: booking_data[:count] || 0 }
      end

      results << {
        name: hotel[:name],
        address: hotel[:address],
        latitude: hotel[:latitude],
        longitude: hotel[:longitude],
        combined_rating: compute_weighted_average(source_ratings),
        total_reviews: source_ratings.sum { |sr| sr[:count] },
        source_ratings: source_ratings,
        sources: sources,
        image_url: hotel[:image_url],
        price_per_night: nil,
        url: booking_data&.dig(:url),
        external_id: hotel[:external_id],
        source: "google"
      }
    end

    results
  rescue => e
    Rails.logger.error("[StreamingAggregator] Google fallback failed: #{e.message}")
    Sentry.capture_exception(e, extra: { location: @location }) if defined?(Sentry)
    []
  end

  def send_event(event, data)
    @stream.write("event: #{event}\n")
    @stream.write("data: #{data.to_json}\n\n")
  rescue IOError
    # Client disconnected
    Rails.logger.info("[StreamingAggregator] Client disconnected")
  end
end
