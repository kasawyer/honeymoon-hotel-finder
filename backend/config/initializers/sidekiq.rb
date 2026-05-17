# config/initializers/sidekiq.rb
require "sidekiq"
require "sidekiq-cron"

redis_url = ENV.fetch("REDIS_URL", "redis://localhost:6379/0")

Sidekiq.configure_server do |config|
  config.redis = { url: redis_url }

  # Load cron jobs after Sidekiq starts
  config.on(:startup) do
    schedule = {
      "warm_popular_caches" => {
        "cron" => "0 4 * * *",  # Every day at 4 AM UTC
        "class" => "CacheWarmingJob",
        "queue" => "cache_warming",
        "description" => "Pre-warm Redis cache for popular honeymoon destinations"
      }
    }
    Sidekiq::Cron::Job.load_from_hash(schedule)
  end
end

Sidekiq.configure_client do |config|
  config.redis = { url: redis_url }
end
