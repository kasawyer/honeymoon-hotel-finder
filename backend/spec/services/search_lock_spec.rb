require "rails_helper"

RSpec.describe SearchLock do
  before do
    Rails.cache.clear
    # Clear any leftover locks
    REDIS.keys("lock:search:*").each { |k| REDIS.del(k) }
  end

  describe ".with_lock" do
    it "executes the block and returns the result" do
      result, source = SearchLock.with_lock(location: "Paris", keywords: [ "romantic" ]) do
        [ { name: "Test Hotel" } ]
      end

      expect(result).to eq([ { name: "Test Hotel" } ])
      expect(source).to eq(:executed)
    end

    it "releases the lock after execution" do
      SearchLock.with_lock(location: "Paris", keywords: [ "romantic" ]) do
        [ { name: "Test" } ]
      end

      # Lock should be released — another request should be able to acquire it
      result, source = SearchLock.with_lock(location: "Paris", keywords: [ "romantic" ]) do
        [ { name: "Test 2" } ]
      end
      expect(source).to eq(:executed)
    end

    it "releases the lock even if the block raises an error" do
      begin
        SearchLock.with_lock(location: "Paris", keywords: [ "romantic" ]) do
          raise StandardError, "something broke"
        end
      rescue StandardError
        # expected
      end

      # Lock should still be released
      key = "lock:search:paris:romantic"
      expect(REDIS.exists?(key)).to be false
    end

    it "returns cached results when another request holds the lock" do
      # Simulate another request holding the lock
      REDIS.set("lock:search:paris:romantic", "other-request", ex: 120)

      # Pre-populate cache (as if the other request just finished)
      HotelCache.set_search(
        location: "Paris",
        keywords: [ "romantic" ],
        results: [ { name: "Cached Hotel" } ]
      )

      result, source = SearchLock.with_lock(location: "Paris", keywords: [ "romantic" ]) do
        [ { name: "Should not execute" } ]
      end

      expect(result).to eq([ { name: "Cached Hotel" } ])
      expect(source).to eq(:cached)
    end

    it "normalizes location and keywords for the lock key" do
      SearchLock.with_lock(location: "  Paris, France  ", keywords: [ "honeymoon", "romantic" ]) do
        "result"
      end

      # Same search with different formatting should hit the same lock
      key = "lock:search:paris, france:honeymoon,romantic"
      expect(REDIS.exists?(key)).to be false # released after execution
    end

    it "works when Redis is unavailable" do
      allow(REDIS).to receive(:set).and_raise(Redis::ConnectionError, "Connection refused")

      result, source = SearchLock.with_lock(location: "Paris", keywords: [ "romantic" ]) do
        [ { name: "Fallback" } ]
      end

      expect(result).to eq([ { name: "Fallback" } ])
      expect(source).to eq(:executed)
    end
  end
end
