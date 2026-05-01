# app/services/hotel_aggregator.rb
#
# Orchestrates hotel searches with TripAdvisor as the source of truth.
#
# Flow:
# 1. Check cache
# 2. TripAdvisor finds the canonical hotel list (up to 10)
# 3. For each hotel, look it up on Google (Text Search) for rating
# 4. For each hotel, look it up on Booking.com (location + data) for rating + price
# 5. Merge all three ratings into a single card
# 6. Sort by combined rating, cache, and return
#
# API calls per search: ~31
#   - TripAdvisor: 2 (location + search)
#   - Google: 10 (one Text Search per hotel)
#   - Booking: 20 (location + data per hotel)
#
class HotelAggregator
  DEFAULT_KEYWORDS = %w[romantic honeymoon anniversary].freeze
  MAX_HOTELS = 20

  def initialize(location:, check_in: nil, check_out: nil, keywords: nil)
    @location = location
    @check_in = check_in || Date.tomorrow.to_s
    @check_out = check_out || (Date.tomorrow + 3).to_s
    @keywords = keywords.presence || DEFAULT_KEYWORDS
  end

  def search
    cache_key = build_cache_key

    # 1. Check cache
    cached = CachedSearch.find_valid(location: @location, query: cache_key)
    return cached.results.map(&:deep_symbolize_keys) if cached

    # 2. TripAdvisor is the primary source
    ta_hotels = fetch_tripadvisor

    if ta_hotels.any?
      # 3. Enrich with Google + Booking ratings
      ta_hotels = ta_hotels.first(MAX_HOTELS)
      merged = enrich_hotels(ta_hotels)
    else
      # 4. Fallback: use Google Places as the primary source
      Rails.logger.info("[Aggregator] TripAdvisor returned no results, falling back to Google Places")
      merged = fetch_google_fallback
    end

    return [] if merged.empty?

    # 5. Sort by combined rating descending, then price ascending
    sorted = merged.sort_by { |h| [ -(h[:combined_rating] || 0), (h[:price_per_night] || Float::INFINITY) ] }

    # 6. Cache (only if we got results)
    write_cache(cache_key, sorted) if sorted.any?

    sorted
  end

  private

  def with_retry(max_attempts: 3, base_delay: 2)
    attempts = 0
    begin
      attempts += 1
      yield
    rescue Faraday::Error, StandardError => e
      if attempts < max_attempts && (e.message.include?("429") || e.message.include?("rate"))
        delay = base_delay * attempts
        Rails.logger.warn("[Aggregator] Rate limited, retrying in #{delay}s (attempt #{attempts}/#{max_attempts})")
        sleep(delay)
        retry
      else
        raise
      end
    end
  end

  def build_cache_key
    @keywords.map(&:downcase).sort.join(",")
  end

  # ── Primary source: TripAdvisor ─────────────────────────────────────

  def fetch_tripadvisor
    hotels = TripadvisorService.new.search_hotels(
      location: @location,
      check_in: @check_in,
      check_out: @check_out,
      keywords: @keywords
    )
    Rails.logger.info("[Aggregator] TripAdvisor returned #{hotels.length} results")
    hotels
  rescue => e
    Rails.logger.error("[Aggregator] TripAdvisor failed: #{e.message}")
    []
  end

  # ── Enrich each hotel with Google + Booking data ────────────────────

  def enrich_hotels(ta_hotels)
    # Process in batches of 3 to balance speed vs rate limits
    ta_hotels.each_slice(3).flat_map do |batch|
      threads = batch.map do |ta_hotel|
        Thread.new do
          google_data = lookup_google(ta_hotel[:name])
          booking_data = lookup_booking(ta_hotel[:name])
          build_merged_hotel(ta_hotel, google_data, booking_data)
        rescue => e
          Rails.logger.error("[Aggregator] Enrich failed for #{ta_hotel[:name]}: #{e.message}")
          build_merged_hotel(ta_hotel, nil, nil)
        end
      end

      results = threads.map { |t| t.join(15)&.value }
      results.compact

      # Small delay between batches to avoid rate limits
      sleep(0.5)
      results.compact
    end
  end

  # ── Google lookup ───────────────────────────────────────────────────

  def lookup_google(hotel_name)
    conn = google_connection
    response = conn.post("/v1/places:searchText") do |req|
      req.headers["X-Goog-FieldMask"] = "places.id,places.displayName,places.rating,places.userRatingCount,places.formattedAddress,places.location,places.photos"
      req.body = {
        textQuery: "#{hotel_name} hotel #{@location}",
        maxResultCount: 1
      }.to_json
    end

    return nil unless response.success?

    place = response.body.dig("places", 0)
    return nil unless place

    {
      source: "google",
      rating: place["rating"],
      count: place["userRatingCount"] || 0,
      address: place["formattedAddress"],
      latitude: place.dig("location", "latitude"),
      longitude: place.dig("location", "longitude"),
      image_url: build_google_photo_url(place.dig("photos", 0, "name"))
    }
  rescue => e
    Rails.logger.error("[Aggregator] Google lookup failed for #{hotel_name}: #{e.message}")
    nil
  end

  def fetch_google_fallback
    service = GooglePlacesService.new
    geo = service.geocode(@location)
    return [] unless geo

    google_hotels = service.search_hotels(
      latitude: geo[:latitude],
      longitude: geo[:longitude],
      keywords: @keywords
    ).first(MAX_HOTELS)

    Rails.logger.info("[Aggregator] Google fallback returned #{google_hotels.length} results")

    google_hotels.map do |hotel|
      booking_data = lookup_booking(hotel[:name])

      source_ratings = []
      sources = [ "google" ]

      if hotel[:rating].present?
        source_ratings << {
          source: "google",
          rating: hotel[:rating].to_f.round(1),
          count: hotel[:total_ratings] || 0
        }
      end

      if booking_data&.dig(:rating).present?
        sources << "booking"
        source_ratings << {
          source: "booking",
          rating: booking_data[:rating].to_f.round(1),
          count: booking_data[:count] || 0
        }
      end

      combined_rating = compute_weighted_average(source_ratings)
      total_reviews = source_ratings.sum { |sr| sr[:count] }

      {
        name: hotel[:name],
        address: hotel[:address],
        latitude: hotel[:latitude],
        longitude: hotel[:longitude],
        combined_rating: combined_rating,
        total_reviews: total_reviews,
        source_ratings: source_ratings,
        sources: sources,
        image_url: hotel[:image_url],
        price_per_night: booking_data&.dig(:url) ? nil : nil, # Google doesn't have prices
        url: booking_data&.dig(:url),
        external_id: hotel[:external_id],
        source: "google"
      }
    end
  rescue => e
    Rails.logger.error("[Aggregator] Google fallback failed: #{e.message}")
    []
  end

  # ── Booking.com lookup (two-step: searchDestination → getHotelReviewScores) ──

  def lookup_booking(hotel_name)
    conn = booking_connection

    # Step 1: Find the hotel's dest_id (with retry)
    loc_response = with_retry do
      resp = conn.get("/api/v1/hotels/searchDestination", { query: hotel_name })
      raise StandardError, "429 rate limit" if resp.status == 429
      resp
    end
    return nil unless loc_response.success?

    locations = loc_response.body.dig("data") || []
    locations = [ locations ] if locations.is_a?(Hash)

    # Find the best match — prefer type "ho" (hotel) and matching city
    city_filter = @location.split(",").first.strip.downcase
    hotel_match = locations.find do |loc|
      loc["search_type"] == "hotel" &&
        loc["city_name"]&.downcase&.include?(city_filter)
    end
    hotel_match ||= locations.find { |loc| loc["search_type"] == "hotel" }
    return nil unless hotel_match

    hotel_id = hotel_match["dest_id"]
    booking_url = "https://www.booking.com/hotel/#{hotel_match['cc1']}/#{hotel_id}.html"

    # Step 2: Get review scores (with retry)
    scores_response = with_retry do
      resp = conn.get("/api/v1/hotels/getHotelReviewScores", { hotel_id: hotel_id })
      raise StandardError, "429 rate limit" if resp.status == 429
      resp
    end
    return nil unless scores_response.success?

    score_data = scores_response.body.dig("data") || []
    score_data = [ score_data ] if score_data.is_a?(Hash)

    # Find the "total" customer_type entry for overall score
    breakdown = score_data.first&.dig("score_breakdown") || []
    total_entry = breakdown.find { |b| b["customer_type"] == "total" }
    return nil unless total_entry

    review_score = total_entry["average_score"].to_f
    review_count = total_entry["count"].to_i

    # Also try to get the booking URL from the searchDestination response
    url = hotel_match["url"] || booking_url

    {
      source: "booking",
      rating: (review_score / 2.0).round(1),  # Convert 0-10 → 0-5
      rating_raw: review_score,
      count: review_count,
      url: url,
      name: hotel_match["name"]
    }
  rescue => e
    Rails.logger.error("[Aggregator] Booking lookup failed for #{hotel_name}: #{e.message}")
    nil
  end

  # ── Build the merged hotel record ───────────────────────────────────

  def build_merged_hotel(ta_hotel, google_data, booking_data)
    source_ratings = []
    sources = [ "tripadvisor" ]

    # TripAdvisor rating (already on 0-5 scale)
    if ta_hotel[:rating].present?
      source_ratings << {
        source: "tripadvisor",
        rating: ta_hotel[:rating].to_f.round(1),
        count: ta_hotel[:total_ratings] || 0
      }
    end

    # Google rating (already on 0-5 scale)
    if google_data&.dig(:rating).present?
      sources << "google"
      source_ratings << {
        source: "google",
        rating: google_data[:rating].to_f.round(1),
        count: google_data[:count] || 0
      }
    end

    # Booking rating (converted from 0-10 to 0-5)
    if booking_data&.dig(:rating).present?
      sources << "booking"
      source_ratings << {
        source: "booking",
        rating: booking_data[:rating].to_f.round(1),
        count: booking_data[:count] || 0
      }
    end

    combined_rating = compute_weighted_average(source_ratings)
    total_reviews = source_ratings.sum { |sr| sr[:count] }

    # Best image: prefer Google (higher quality), fall back to TripAdvisor
    image_url = google_data&.dig(:image_url) || ta_hotel[:image_url]

    # Best price: prefer Booking (usually has prices), fall back to TripAdvisor
    price = ta_hotel[:price_per_night]

    # Best URL: prefer Booking (direct booking link), fall back to TripAdvisor
    url = booking_data&.dig(:url) || ta_hotel[:url]

    # Best address/coordinates: prefer Google (most accurate)
    address = google_data&.dig(:address) || ta_hotel[:address]
    latitude = google_data&.dig(:latitude)
    longitude = google_data&.dig(:longitude)

    {
      name: ta_hotel[:name],
      address: address,
      latitude: latitude,
      longitude: longitude,
      combined_rating: combined_rating,
      total_reviews: total_reviews,
      source_ratings: source_ratings,
      sources: sources,
      image_url: image_url,
      price_per_night: price,
      url: url,
      external_id: ta_hotel[:external_id],
      source: "tripadvisor"
    }
  end

  def compute_weighted_average(source_ratings)
    return nil if source_ratings.empty?

    rated = source_ratings.select { |sr| sr[:rating].present? }
    return nil if rated.empty?

    total_count = rated.sum { |sr| sr[:count] }

    if total_count > 0
      weighted_sum = rated.sum { |sr| sr[:rating] * sr[:count] }
      (weighted_sum / total_count).round(1)
    else
      (rated.sum { |sr| sr[:rating] } / rated.size).round(1)
    end
  end

  # ── Connections ─────────────────────────────────────────────────────

  def google_connection
    Faraday.new(url: "https://places.googleapis.com") do |f|
      f.request :json
      f.response :json, content_type: /\bjson$/
      f.options.timeout = 10
      f.options.open_timeout = 5
      f.headers["X-Goog-Api-Key"] = ENV.fetch("GOOGLE_MAPS_API_KEY")
      f.headers["Content-Type"] = "application/json"
    end
  end

  def booking_connection
    Faraday.new(url: "https://booking-com15.p.rapidapi.com") do |f|
      f.request :json
      f.response :json, content_type: /\bjson$/
      f.options.timeout = 10
      f.options.open_timeout = 5
      f.headers["X-RapidAPI-Key"] = ENV.fetch("RAPIDAPI_KEY")
      f.headers["X-RapidAPI-Host"] = "booking-com15.p.rapidapi.com"
    end
  end

  def build_google_photo_url(photo_name)
    return nil unless photo_name
    "https://places.googleapis.com/v1/#{photo_name}/media?maxWidthPx=400&key=#{ENV.fetch('GOOGLE_MAPS_API_KEY')}"
  end

  def write_cache(cache_key, results)
    CachedSearch.upsert(
      {
        location: @location.downcase.strip,
        query: cache_key,
        results: results.map { |r| r.transform_keys(&:to_s) },
        expires_at: 1.hour.from_now,
        created_at: Time.current,
        updated_at: Time.current
      },
      unique_by: [ :location, :query ]
    )
  rescue => e
    Rails.logger.error("[Aggregator] Cache write failed: #{e.message}")
  end
end
