require "rails_helper"

RSpec.describe WarmDestinationCacheJob, type: :job do
  before do
    Rails.cache.clear
    allow(ENV).to receive(:fetch).with("GOOGLE_MAPS_API_KEY").and_return("test_key")
    allow(ENV).to receive(:fetch).with("RAPIDAPI_KEY").and_return("test_key")
  end

  it "is enqueued in the cache_warming queue" do
    expect {
      WarmDestinationCacheJob.perform_later("Paris")
    }.to have_enqueued_job(WarmDestinationCacheJob).on_queue("cache_warming")
  end

  it "warms cache for the given destination" do
    aggregator = instance_double(HotelAggregator)
    allow(HotelAggregator).to receive(:new).and_return(aggregator)
    allow(aggregator).to receive(:search).and_return([ { name: "Hotel" } ])

    WarmDestinationCacheJob.perform_now("Paris, France")

    expect(HotelAggregator).to have_received(:new).with(
      hash_including(location: "Paris, France")
    )
  end

  it "skips if already cached" do
    HotelCache.set_search(
      location: "Paris, France",
      keywords: %w[romantic honeymoon anniversary],
      results: [ { name: "Cached" } ]
    )

    allow(HotelAggregator).to receive(:new)

    WarmDestinationCacheJob.perform_now("Paris, France")

    expect(HotelAggregator).not_to have_received(:new)
  end

  it "does not raise on failure" do
    aggregator = instance_double(HotelAggregator)
    allow(HotelAggregator).to receive(:new).and_return(aggregator)
    allow(aggregator).to receive(:search).and_raise(StandardError, "API error")

    expect { WarmDestinationCacheJob.perform_now("Paris") }.not_to raise_error
  end
end
