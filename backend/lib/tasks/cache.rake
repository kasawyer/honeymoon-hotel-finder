# lib/tasks/cache.rake
namespace :cache do
  desc "Clear all Redis cache"
  task clear: :environment do
    HotelCache.clear_all
    puts "Cache cleared"
  end

  desc "Show Redis cache stats"
  task stats: :environment do
    stats = HotelCache.stats
    puts "Redis Cache Stats:"
    puts "  Memory used: #{stats[:used_memory]}"
    puts "  Connected clients: #{stats[:connected_clients]}"
    puts "  Total keys: #{stats[:total_keys]}"
    puts "  Uptime: #{stats[:uptime_days]} days"
  end

  desc "Warm cache for all popular destinations"
  task warm: :environment do
    puts "Enqueuing cache warming job..."
    CacheWarmingJob.perform_later
    puts "Cache warming job enqueued. Run 'bundle exec sidekiq' to process it."
  end

  desc "Warm cache for a single destination (e.g., rake cache:warm_one[Paris])"
  task :warm_one, [ :destination ] => :environment do |_t, args|
    destination = args[:destination] || "Paris, France"
    puts "Warming cache for #{destination}..."
    WarmDestinationCacheJob.perform_now(destination)
    puts "Done."
  end
end
