require "rails_helper"

RSpec.describe HotelAggregator do
  let(:aggregator) do
    described_class.new(
      location: "Paris, France",
      check_in: "2025-06-01",
      check_out: "2025-06-04",
      keywords: ["romantic"]
    )
  end

  describe "#search" do
    context "when cache is empty" do
      before do
        # Stub all external APIs
        google_service = instance_double(GooglePlacesService)
        allow(GooglePlacesService).to receive(:new).and_return(google_service)
        allow(google_service).to receive(:geocode).and_return({
          latitude: 48.8566, longitude: 2.3522
        })
        allow(google_service).to receive(:search_hotels).and_return([
          { source: "google", name: "Romantic Hotel Paris", rating: 4.5,
            external_id: "g1", address: "Paris", latitude: 48.86, longitude: 2.35,
            image_url: nil, price_per_night: nil, url: nil, total_ratings: 100 }
        ])

        booking_service = instance_double(BookingService)
        allow(BookingService).to receive(:new).and_return(booking_service)
        allow(booking_service).to receive(:search_hotels).and_return([
          { source: "booking", name: "Romantic Hotel Paris", rating: 4.2,
            external_id: "b1", address: "Paris, France", latitude: 48.86, longitude: 2.35,
            image_url: "https://img.com/1.jpg", price_per_night: 250.0, url: "https://booking.com/1",
            total_ratings: 500 }
        ])

        tripadvisor_service = instance_double(TripadvisorService)
        allow(TripadvisorService).to receive(:new).and_return(tripadvisor_service)
        allow(tripadvisor_service).to receive(:search_hotels).and_return([])
      end

      it "aggregates results from all providers" do
        results = aggregator.search
        sources = results.map { |h| h[:source] }.uniq
        expect(sources).to include("booking")
        # Google and Booking both have "Romantic Hotel Paris" — should be deduped
      end

      it "deduplicates hotels with the same name" do
        results = aggregator.search
        names = results.map { |h| h[:name] }
        # "Romantic Hotel Paris" appears in both Google and Booking
        expect(names.count("Romantic Hotel Paris")).to eq(1)
      end

      it "keeps the version with more complete data" do
        results = aggregator.search
        paris_hotel = results.find { |h| h[:name] == "Romantic Hotel Paris" }
        # Booking has price + image + url, Google doesn't — Booking should win
        expect(paris_hotel[:source]).to eq("booking")
        expect(paris_hotel[:price_per_night]).to eq(250.0)
      end

      it "sorts by rating descending" do
        results = aggregator.search
        ratings = results.map { |h| h[:rating] }
        expect(ratings).to eq(ratings.sort.reverse)
      end

      it "caches the results" do
        aggregator.search
        cached = CachedSearch.find_valid(location: "Paris, France", query: "romantic")
        expect(cached).to be_present
        expect(cached.results).to be_an(Array)
      end
    end

    context "when cache has valid results" do
      before do
        CachedSearch.create!(
          location: "paris, france",
          query: "romantic",
          results: [{ "source" => "cached", "name" => "Cached Hotel", "rating" => 4.0 }],
          expires_at: 30.minutes.from_now
        )
      end

      it "returns cached results without calling APIs" do
        expect(GooglePlacesService).not_to receive(:new)
        expect(BookingService).not_to receive(:new)

        results = aggregator.search
        expect(results.first[:name]).to eq("Cached Hotel")
      end
    end
  end
end
