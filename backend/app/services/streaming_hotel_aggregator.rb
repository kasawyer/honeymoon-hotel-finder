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
    # 2. Search TripAdvisor
    send_event("progress", { stage: "tripadvisor", message: "Searching TripAdvisor...", percent: 10 })
    ta_hotels = fetch_tripadvisor
    provider_errors = []

    if ta_hotels.any?
      ta_hotels = ta_hotels.first(MAX_HOTELS)
      send_event("progress", {
        stage: "tripadvisor_done",
        message: "Found #{ta_hotels.length} hotels on TripAdvisor",
        percent: 20
      })

      merged, enrich_errors = enrich_hotels_with_progress(ta_hotels)
      provider_errors.concat(enrich_errors)
    else
      provider_errors << "TripAdvisor"
      send_event("progress", {
        stage: "tripadvisor_fallback",
        message: "TripAdvisor unavailable, searching Google Places...",
        percent: 15
      })
      merged = fetch_google_fallback_with_progress
    end

    if merged.empty?
      send_event("complete", { hotels: [], count: 0, cached: false, provider_errors: provider_errors })
      return
    end

    # Sort
    sorted = merged.sort_by { |h| [ -(h[:combined_rating] || 0), (h[:price_per_night] || Float::INFINITY) ] }

    # Cache
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
      provider_errors: provider_errors.uniq
    })
  end

  def enrich_hotels_with_progress(ta_hotels)
    results = []
    total = ta_hotels.length
    google_failures = 0
    booking_failures = 0

    ta_hotels.each_slice(3).with_index do |batch, batch_index|
      completed = batch_index * 3

      send_event("progress", {
        stage: "enriching",
        message: "Checking Google & Booking.com (#{[ completed, total ].min}/#{total})...",
        percent: 20 + ((completed.to_f / total) * 70).round
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

    send_event("progress", {
      stage: "enriching_done",
      message: "All #{total} hotels enriched with ratings",
      percent: 95
    })

    errors = []
    errors << "Google" if google_failures > total / 2
    errors << "Booking.com" if booking_failures > total / 2

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
