# app/services/hotel_aggregator.rb
#
# Orchestrates parallel hotel searches across all providers.
#
# Flow:
# 1. Check cache for existing results
# 2. If cache miss: call all 4 APIs in parallel threads
# 3. Merge results, deduplicate by normalized hotel name
# 4. Sort by rating (highest first)
# 5. Cache for 1 hour and return
#
class HotelAggregator
  DEFAULT_KEYWORDS = %w[romantic honeymoon anniversary].freeze

  def initialize(location:, check_in: nil, check_out: nil, keywords: nil)
    @location = location
    @check_in = check_in || Date.tomorrow.to_s
    @check_out = check_out || (Date.tomorrow + 3).to_s
    @keywords = keywords.presence || DEFAULT_KEYWORDS
  end

  def search
    cache_key = build_cache_key

    # 1. Check cache
    cached = CachedSearch.find_valid(
      location: @location,
      query: cache_key
    )
    return cached.results.map(&:deep_symbolize_keys) if cached

    # 2. Fetch from all sources in parallel
    raw_results = fetch_all_sources

    # 3. Deduplicate
    unique = deduplicate(raw_results)

    # 4. Sort by rating descending, then by price ascending for ties
    sorted = unique.sort_by { |h| [-(h[:rating] || 0), (h[:price_per_night] || Float::INFINITY)] }

    # 5. Cache
    write_cache(cache_key, sorted)

    sorted
  end

  private

  def build_cache_key
    @keywords.map(&:downcase).sort.join(",")
  end

  def fetch_all_sources
    results = Concurrent::Array.new
    threads = []

    # --- Google Places ---
    threads << Thread.new do
      Thread.current.name = "google"
      geo = GooglePlacesService.new.geocode(@location)
      if geo
        hotels = GooglePlacesService.new.search_hotels(
          latitude: geo[:latitude],
          longitude: geo[:longitude],
          keywords: @keywords
        )
        results.concat(hotels)
        Rails.logger.info("[Aggregator] Google returned #{hotels.length} results")
      end
    rescue => e
      Rails.logger.error("[Aggregator] Google failed: #{e.message}")
    end

    # --- Booking.com ---
    threads << Thread.new do
      Thread.current.name = "booking"
      hotels = BookingService.new.search_hotels(
        location: @location,
        check_in: @check_in,
        check_out: @check_out,
        keywords: @keywords
      )
      results.concat(hotels)
      Rails.logger.info("[Aggregator] Booking returned #{hotels.length} results")
    rescue => e
      Rails.logger.error("[Aggregator] Booking failed: #{e.message}")
    end

    # --- TripAdvisor ---
    threads << Thread.new do
      Thread.current.name = "tripadvisor"
      hotels = TripadvisorService.new.search_hotels(
        location: @location,
        check_in: @check_in,
        check_out: @check_out,
        keywords: @keywords
      )
      results.concat(hotels)
      Rails.logger.info("[Aggregator] TripAdvisor returned #{hotels.length} results")
    rescue => e
      Rails.logger.error("[Aggregator] TripAdvisor failed: #{e.message}")
    end

    threads.each { |t| t.join(20) } # 20-second timeout per thread
    results.to_a
  end

  def deduplicate(results)
    seen = {}

    results.each do |hotel|
      next if hotel[:name].blank?

      # Normalize: "The Ritz-Carlton, Paris" → "theritzcarltonparis"
      key = hotel[:name].downcase.gsub(/[^a-z0-9]/, "")
      next if key.blank?

      if seen[key]
        # Keep the version with more useful data
        existing = seen[key]
        score = data_completeness(hotel)
        existing_score = data_completeness(existing)
        seen[key] = hotel if score > existing_score
      else
        seen[key] = hotel
      end
    end

    seen.values
  end

  # Score how "complete" a hotel record is (more fields = better)
  def data_completeness(hotel)
    score = 0
    score += 2 if hotel[:price_per_night].present?
    score += 2 if hotel[:rating].present?
    score += 1 if hotel[:image_url].present?
    score += 1 if hotel[:url].present?
    score += 1 if hotel[:latitude].present?
    score += 1 if hotel[:total_ratings].present?
    score
  end

  def write_cache(cache_key, results)
    CachedSearch.upsert(
      {
        location: @location.downcase.strip,
        query: cache_key,
        results: results.map(&:stringify_keys),
        expires_at: 1.hour.from_now,
        created_at: Time.current,
        updated_at: Time.current
      },
      unique_by: [:location, :query]
    )
  rescue => e
    # Don't let cache write failures break the search
    Rails.logger.error("[Aggregator] Cache write failed: #{e.message}")
  end
end
