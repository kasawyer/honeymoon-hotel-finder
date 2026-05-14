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

  desc "Purge expired CachedSearch records (legacy PostgreSQL)"
  task purge_expired: :environment do
    count = CachedSearch.expired.delete_all
    puts "Purged #{count} expired cache entries from PostgreSQL"
  end
end
