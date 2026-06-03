# app/services/api_usage_tracker.rb
#
# Tracks API call counts per provider using Redis.
# Counters reset at the start of each month (matching RapidAPI billing cycles).
#
# Usage:
#   ApiUsageTracker.record(:tripadvisor)
#   ApiUsageTracker.usage(:tripadvisor)  # => { count: 42, limit: 500, remaining: 458 }
#   ApiUsageTracker.available?(:tripadvisor)  # => true
#
class ApiUsageTracker
  # Monthly limits per provider (free tier)
  LIMITS = {
    tripadvisor: ENV.fetch("TRIPADVISOR_MONTHLY_LIMIT", 500).to_i,
    booking: ENV.fetch("BOOKING_MONTHLY_LIMIT", 500).to_i,
    google: ENV.fetch("GOOGLE_MONTHLY_LIMIT", 5000).to_i
  }.freeze

  # Warning threshold — show degradation notice at 80% usage
  WARNING_THRESHOLD = 0.8

  # Hard cutoff — stop calling at 95% to leave buffer
  CUTOFF_THRESHOLD = 0.95

  class << self
    # Record an API call for a provider
    def record(provider, count: 1)
      key = counter_key(provider)
      Rails.cache.increment(key, count)
    rescue => e
      Rails.logger.error("[ApiUsageTracker] Failed to record usage for #{provider}: #{e.message}")
    end

    # Get current usage for a provider
    def usage(provider)
      key = counter_key(provider)
      count = (Rails.cache.read(key) || 0).to_i
      limit = LIMITS.fetch(provider.to_sym, 500)
      remaining = [ limit - count, 0 ].max

      {
        provider: provider.to_s,
        count: count,
        limit: limit,
        remaining: remaining,
        percentage: limit > 0 ? ((count.to_f / limit) * 100).round(1) : 0,
        warning: count >= (limit * WARNING_THRESHOLD),
        exhausted: count >= (limit * CUTOFF_THRESHOLD)
      }
    end

    # Check if a provider is still available (under cutoff threshold)
    def available?(provider)
      !usage(provider)[:exhausted]
    end

    # Check if a provider is approaching its limit
    def warning?(provider)
      usage(provider)[:warning]
    end

    # Get usage for all providers
    def all_usage
      LIMITS.keys.map { |provider| usage(provider) }
    end

    # Get list of providers that are near or at their limit
    def degraded_providers
      all_usage.select { |u| u[:warning] }.map { |u| u[:provider] }
    end

    # Get list of providers that are exhausted
    def exhausted_providers
      all_usage.select { |u| u[:exhausted] }.map { |u| u[:provider] }
    end

    # Reset counters (for testing or manual reset)
    def reset(provider = nil)
      if provider
        Rails.cache.delete(counter_key(provider))
      else
        LIMITS.keys.each { |p| Rails.cache.delete(counter_key(p)) }
      end
    end

    private

    def counter_key(provider)
      month = Time.current.strftime("%Y-%m")
      "api_usage:#{provider}:#{month}"
    end
  end
end
