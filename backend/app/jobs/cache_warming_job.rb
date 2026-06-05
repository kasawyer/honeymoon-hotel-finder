# app/jobs/cache_warming_job.rb
#
# Runs daily at 4 AM UTC to pre-warm the Redis cache for popular destinations.
# Each destination is searched with each keyword set, so users get instant
# results for the most common searches.
#
class CacheWarmingJob < ApplicationJob
  queue_as :cache_warming

  POPULAR_DESTINATIONS = [
    "Paris, France",
    "Bali, Indonesia",
    "Santorini, Greece",
    "Maldives",
    "Amalfi Coast, Italy",
    "Bora Bora",
    "Maui, Hawaii",
    "Cancun, Mexico",
    "Phuket, Thailand",
    "Dubrovnik, Croatia",
    "Fiji",
    "Tulum, Mexico",
    "Lake Como, Italy",
    "Mykonos, Greece",
    "Seychelles"
  ].freeze

  KEYWORD_SETS = [
    %w[romantic honeymoon anniversary],
    %w[romantic honeymoon],
    %w[luxury spa]
  ].freeze

  def perform
    Rails.logger.info("[CacheWarming] Starting cache warming for #{POPULAR_DESTINATIONS.length} destinations")
    start_time = Time.current

    results = { success: 0, failed: 0, skipped: 0 }

    POPULAR_DESTINATIONS.each do |destination|
      KEYWORD_SETS.each do |keywords|
        warm_cache(destination, keywords, results)
        sleep(2)
      end
    end

    duration = (Time.current - start_time).round(1)
    Rails.logger.info(
      "[CacheWarming] Completed in #{duration}s — " \
        "#{results[:success]} warmed, #{results[:skipped]} still fresh, #{results[:failed]} failed"
    )
  end

  private

  def warm_cache(destination, keywords, results)
    # Check if cache exists and is less than a week old
    if HotelCache.fresh?(location: destination, keywords: keywords)
      Rails.logger.debug("[CacheWarming] Still fresh: #{destination} [#{keywords.join(', ')}]")
      results[:skipped] += 1
      return
    end

    Rails.logger.info("[CacheWarming] Warming: #{destination} [#{keywords.join(', ')}]")

    aggregator = HotelAggregator.new(
      location: destination,
      keywords: keywords
    )
    hotel_results = aggregator.search

    if hotel_results.any?
      results[:success] += 1
      Rails.logger.info("[CacheWarming] Cached #{hotel_results.length} hotels for #{destination}")
    else
      results[:failed] += 1
      Rails.logger.warn("[CacheWarming] No results for #{destination}")
    end
  rescue => e
    results[:failed] += 1
    Rails.logger.error("[CacheWarming] Failed for #{destination}: #{e.message}")
    Sentry.capture_exception(e, extra: { destination: destination, keywords: keywords }) if defined?(Sentry)
  end
end
