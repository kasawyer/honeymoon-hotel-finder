require "rails_helper"

RSpec.describe CacheWarmingJob, type: :job do
  before do
    Rails.cache.clear
    allow(ENV).to receive(:fetch).with("GOOGLE_MAPS_API_KEY").and_return("test_key")
    allow(ENV).to receive(:fetch).with("RAPIDAPI_KEY").and_return("test_key")
  end

  describe "#perform" do
    it "is enqueued in the cache_warming queue" do
      expect {
        CacheWarmingJob.perform_later
      }.to have_enqueued_job(CacheWarmingJob).on_queue("cache_warming")
    end

    it "warms cache for popular destinations" do
      # Mock the aggregator to avoid real API calls
      aggregator = instance_double(HotelAggregator)
      allow(HotelAggregator).to receive(:new).and_return(aggregator)
      allow(aggregator).to receive(:search).and_return([
                                                         { name: "Test Hotel", combined_rating: 4.5 }
                                                       ])

      # Should not raise
      expect { CacheWarmingJob.perform_now }.not_to raise_error
    end

    it "skips destinations that are already cached" do
      # Pre-warm one destination
      HotelCache.set_search(
        location: "Paris, France",
        keywords: %w[romantic honeymoon anniversary],
        results: [ { name: "Cached Hotel" } ]
      )

      aggregator = instance_double(HotelAggregator)
      allow(HotelAggregator).to receive(:new).and_return(aggregator)
      allow(aggregator).to receive(:search).and_return([ { name: "Hotel" } ])

      CacheWarmingJob.perform_now

      # Paris with default keywords should not have triggered a new aggregator call
      # (it was already cached)
      expect(HotelAggregator).not_to have_received(:new).with(
        hash_including(location: "Paris, France", keywords: %w[romantic honeymoon anniversary])
      )
    end

    it "continues warming other destinations when one fails" do
      call_count = 0
      allow(HotelAggregator).to receive(:new) do
        call_count += 1
        aggregator = instance_double(HotelAggregator)
        if call_count == 1
          allow(aggregator).to receive(:search).and_raise(StandardError, "API down")
        else
          allow(aggregator).to receive(:search).and_return([ { name: "Hotel" } ])
        end
        aggregator
      end

      # Should not raise even though one destination fails
      expect { CacheWarmingJob.perform_now }.not_to raise_error
    end
  end
end
