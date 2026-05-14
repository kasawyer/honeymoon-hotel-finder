# app/services/hotel_cache.rb
#
# Redis-backed cache for hotel search results and individual hotel lookups.
#
# Keys:
#   search:<location>:<keywords>       — full search results (TTL: 2 hours)
#   google:<hotel_name>:<location>     — Google Places lookup (TTL: 24 hours)
#   booking:<hotel_name>:<location>    — Booking.com lookup (TTL: 24 hours)
#
class HotelCache
  SEARCH_TTL = 2.hours
  HOTEL_LOOKUP_TTL = 24.hours

  class << self
    # ── Search results cache ──────────────────────────────────────

    def get_search(location:, keywords:)
      key = search_key(location, keywords)
      data = Rails.cache.read(key)
      if data
        Rails.logger.info("[HotelCache] Search cache HIT for #{key}")
        data
      else
        Rails.logger.info("[HotelCache] Search cache MISS for #{key}")
        nil
      end
    rescue => e
      Rails.logger.error("[HotelCache] Read error: #{e.message}")
      nil
    end

    def set_search(location:, keywords:, results:)
      key = search_key(location, keywords)
      Rails.cache.write(key, results, expires_in: SEARCH_TTL)
      Rails.logger.info("[HotelCache] Cached #{results.length} search results for #{key}")
    rescue => e
      Rails.logger.error("[HotelCache] Write error: #{e.message}")
    end

    # ── Individual hotel lookup cache ─────────────────────────────

    def get_google(hotel_name:, location:)
      key = hotel_key("google", hotel_name, location)
      Rails.cache.read(key)
    end

    def set_google(hotel_name:, location:, data:)
      key = hotel_key("google", hotel_name, location)
      Rails.cache.write(key, data, expires_in: HOTEL_LOOKUP_TTL)
    end

    def get_booking(hotel_name:, location:)
      key = hotel_key("booking", hotel_name, location)
      Rails.cache.read(key)
    end

    def set_booking(hotel_name:, location:, data:)
      key = hotel_key("booking", hotel_name, location)
      Rails.cache.write(key, data, expires_in: HOTEL_LOOKUP_TTL)
    end

    # ── Cache management ──────────────────────────────────────────

    def clear_all
      Rails.cache.clear
      Rails.logger.info("[HotelCache] All cache cleared")
    end

    def stats
      info = REDIS.info
      {
        used_memory: info["used_memory_human"],
        connected_clients: info["connected_clients"],
        total_keys: REDIS.dbsize,
        uptime_days: info["uptime_in_days"]
      }
    rescue => e
      Rails.logger.error("[HotelCache] Stats error: #{e.message}")
      {}
    end

    private

    def search_key(location, keywords)
      normalized_keywords = keywords.map(&:downcase).sort.join(",")
      "search:#{location.downcase.strip}:#{normalized_keywords}"
    end

    def hotel_key(source, hotel_name, location)
      normalized_name = hotel_name.downcase.gsub(/[^a-z0-9]/, "")
      normalized_location = location.split(",").first.strip.downcase
      "#{source}:#{normalized_name}:#{normalized_location}"
    end
  end
end
