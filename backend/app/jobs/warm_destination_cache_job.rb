# app/jobs/warm_destination_cache_job.rb
#
# Warms the cache for a single destination. Can be triggered on-demand
# after a cache miss, so the next user gets instant results.
#
class WarmDestinationCacheJob < ApplicationJob
  queue_as :cache_warming

  def perform(destination, keywords = %w[romantic honeymoon anniversary])
    return if HotelCache.get_search(location: destination, keywords: keywords)

    Rails.logger.info("[WarmDestinationCache] Warming cache for #{destination}")

    aggregator = HotelAggregator.new(
      location: destination,
      keywords: keywords
    )
    aggregator.search
  rescue => e
    Rails.logger.error("[WarmDestinationCache] Failed for #{destination}: #{e.message}")
    Sentry.capture_exception(e, extra: { destination: destination }) if defined?(Sentry)
  end
end
