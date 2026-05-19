# app/services/search_lock.rb
#
# Prevents duplicate simultaneous API calls for the same search.
# Uses Redis to coordinate across multiple Puma threads/workers.
#
# When a search starts:
#   1. Try to acquire a lock for this location+keywords
#   2. If locked by another request, wait for it to finish and read from cache
#   3. If unlocked, acquire the lock, run the search, release the lock
#
class SearchLock
  LOCK_TTL = 120 # seconds — max time a search can hold the lock
  POLL_INTERVAL = 0.5 # seconds — how often to check if lock is released
  MAX_WAIT = 90 # seconds — max time to wait for another request to finish

  class << self
    # Execute a block with a lock. If another request holds the lock,
    # wait for it to finish and return cached results instead.
    #
    # Returns: [results, source] where source is :executed or :cached
    #
    def with_lock(location:, keywords:, &block)
      key = lock_key(location, keywords)

      # Try to acquire the lock
      acquired = REDIS.set(key, current_request_id, nx: true, ex: LOCK_TTL)

      if acquired
        # We got the lock — execute the search
        begin
          Rails.logger.info("[SearchLock] Lock acquired for #{key}")
          result = block.call
          [ result, :executed ]
        ensure
          # Release the lock
          release_lock(key)
        end
      else
        # Someone else is searching — wait for them to finish
        Rails.logger.info("[SearchLock] Waiting for existing search: #{key}")
        cached_result = wait_for_cache(location, keywords)

        if cached_result
          Rails.logger.info("[SearchLock] Got cached result while waiting for #{key}")
          [ cached_result, :cached ]
        else
          # Timed out waiting — run the search ourselves
          Rails.logger.warn("[SearchLock] Timed out waiting for #{key}, executing search")
          begin
            REDIS.set(key, current_request_id, ex: LOCK_TTL)
            result = block.call
            [ result, :executed ]
          ensure
            release_lock(key)
          end
        end
      end
    rescue Redis::BaseError => e
      # If Redis is down, just run the search without locking
      Rails.logger.error("[SearchLock] Redis error: #{e.message}, running without lock")
      [ block.call, :executed ]
    end

    private

    def lock_key(location, keywords)
      normalized_keywords = keywords.map(&:downcase).sort.join(",")
      "lock:search:#{location.downcase.strip}:#{normalized_keywords}"
    end

    def current_request_id
      "#{Process.pid}-#{Thread.current.object_id}-#{Time.current.to_f}"
    end

    def release_lock(key)
      REDIS.del(key)
      Rails.logger.info("[SearchLock] Lock released for #{key}")
    rescue Redis::BaseError => e
      Rails.logger.error("[SearchLock] Failed to release lock: #{e.message}")
    end

    def wait_for_cache(location, keywords)
      elapsed = 0

      while elapsed < MAX_WAIT
        sleep(POLL_INTERVAL)
        elapsed += POLL_INTERVAL

        # Check if results are now cached
        cached = HotelCache.get_search(location: location, keywords: keywords)
        return cached if cached

        # Check if the lock was released (search finished but maybe didn't cache)
        key = lock_key(location, keywords)
        return nil unless REDIS.exists?(key)
      end

      nil # Timed out
    end
  end
end
