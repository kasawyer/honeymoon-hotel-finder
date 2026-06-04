# config/initializers/sidekiq.rb
require "sidekiq"
require "sidekiq-cron"

redis_url = ENV.fetch("REDIS_URL", "redis://localhost:6379/0")
redis_config = { url: redis_url }

if redis_url.start_with?("rediss://")
  redis_config[:ssl_params] = { verify_mode: OpenSSL::SSL::VERIFY_NONE }
end

Sidekiq.configure_server do |config|
  config.redis = redis_config

  config.on(:startup) do
    schedule = {
      "warm_popular_caches" => {
        "cron" => "0 4 * * *",
        "class" => "CacheWarmingJob",
        "queue" => "cache_warming",
        "description" => "Pre-warm Redis cache for popular honeymoon destinations"
      }
    }
    Sidekiq::Cron::Job.load_from_hash(schedule)
  end
end

Sidekiq.configure_client do |config|
  config.redis = redis_config
end
