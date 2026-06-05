require "rails_helper"

RSpec.describe StreamingHotelAggregator do
  let(:stream) { double("stream", write: nil, close: nil) }
  let(:aggregator) do
    described_class.new(
      location: "Paris, France",
      keywords: [ "romantic" ],
      stream: stream
    )
  end

  before do
    Rails.cache.clear
    REDIS.keys("lock:search:*").each { |k| REDIS.del(k) } rescue nil
  end

  def sent_events
    stream_writes = []
    allow(stream).to receive(:write) { |data| stream_writes << data }
    stream_writes
  end

  def parse_events(writes)
    events = []
    current_event = nil

    writes.each do |w|
      if w.start_with?("event: ")
        current_event = { type: w.strip.sub("event: ", "") }
      elsif w.start_with?("data: ")
        json = w.strip.sub("data: ", "").chomp
        current_event[:data] = JSON.parse(json, symbolize_names: true) rescue json
        events << current_event
        current_event = nil
      end
    end

    events
  end

  describe "#search" do
    context "when cache has results" do
      before do
        HotelCache.set_search(
          location: "Paris, France",
          keywords: [ "romantic" ],
          results: [ { name: "Cached Hotel", combined_rating: 4.5, sources: [ "tripadvisor" ] } ]
        )
      end

      it "sends cache_hit progress event" do
        writes = sent_events
        aggregator.search
        events = parse_events(writes)

        progress = events.find { |e| e[:type] == "progress" && e[:data][:stage] == "cache_hit" }
        expect(progress).to be_present
        expect(progress[:data][:message]).to include("cached")
      end

      it "sends complete event with cached results" do
        writes = sent_events
        aggregator.search
        events = parse_events(writes)

        complete = events.find { |e| e[:type] == "complete" }
        expect(complete).to be_present
        expect(complete[:data][:cached]).to eq(true)
        expect(complete[:data][:count]).to eq(1)
        expect(complete[:data][:hotels].first[:name]).to eq("Cached Hotel")
      end

      it "does not call TripAdvisor" do
        expect(TripadvisorService).not_to receive(:new)
        aggregator.search
      end
    end

    context "when another request holds the lock" do
      before do
        REDIS.set("lock:search:paris, france:romantic", "other-request", ex: 120)
        HotelCache.set_search(
          location: "Paris, France",
          keywords: [ "romantic" ],
          results: [ { name: "Locked Hotel" } ]
        )
      end

      after do
        REDIS.del("lock:search:paris, france:romantic")
      end

      it "returns cached results without running a new search" do
        writes = sent_events
        aggregator.search
        events = parse_events(writes)

        complete = events.find { |e| e[:type] == "complete" }
        expect(complete).to be_present
        expect(complete[:data][:hotels].first[:name]).to eq("Locked Hotel")
      end
    end

    context "when TripAdvisor returns results" do
      let(:ta_hotel) do
        {
          source: "tripadvisor",
          external_id: "197528",
          name: "Le Bristol Paris",
          address: "8th Arr.",
          latitude: nil,
          longitude: nil,
          rating: 4.7,
          total_ratings: 1829,
          image_url: "https://example.com/photo.jpg",
          price_per_night: 1660.0,
          url: "https://www.tripadvisor.in/Hotel-197528"
        }
      end

      before do
        service = instance_double(TripadvisorService)
        allow(TripadvisorService).to receive(:new).and_return(service)
        allow(service).to receive(:search_hotels).and_return([ ta_hotel ])

        stub_request(:post, /places\.googleapis\.com.*searchText/)
          .to_return(
            status: 200,
            headers: { "Content-Type" => "application/json" },
            body: { places: [] }.to_json
          )
        stub_request(:get, /booking-com15\.p\.rapidapi\.com.*searchDestination/)
          .to_return(
            status: 200,
            headers: { "Content-Type" => "application/json" },
            body: { status: true, data: [] }.to_json
          )
      end

      it "sends tripadvisor progress event" do
        writes = sent_events
        aggregator.search
        events = parse_events(writes)

        ta_event = events.find { |e| e[:type] == "progress" && e[:data][:stage] == "tripadvisor" }
        expect(ta_event).to be_present
        expect(ta_event[:data][:message]).to include("TripAdvisor")
      end

      it "sends tripadvisor_done progress event" do
        writes = sent_events
        aggregator.search
        events = parse_events(writes)

        done_event = events.find { |e| e[:type] == "progress" && e[:data][:stage] == "tripadvisor_done" }
        expect(done_event).to be_present
        expect(done_event[:data][:message]).to include("1 hotel")
      end

      it "sends enriching progress events" do
        writes = sent_events
        aggregator.search
        events = parse_events(writes)

        enriching = events.select { |e| e[:type] == "progress" && e[:data][:stage] == "enriching" }
        expect(enriching).not_to be_empty
      end

      it "sends complete event with hotel data" do
        writes = sent_events
        aggregator.search
        events = parse_events(writes)

        complete = events.find { |e| e[:type] == "complete" }
        expect(complete).to be_present
        expect(complete[:data][:cached]).to eq(false)
        expect(complete[:data][:hotels].length).to eq(1)
        expect(complete[:data][:hotels].first[:name]).to eq("Le Bristol Paris")
      end

      it "sends done progress event" do
        writes = sent_events
        aggregator.search
        events = parse_events(writes)

        done = events.find { |e| e[:type] == "progress" && e[:data][:stage] == "done" }
        expect(done).to be_present
        expect(done[:data][:percent]).to eq(100)
      end

      it "includes provider_errors in complete event" do
        writes = sent_events
        aggregator.search
        events = parse_events(writes)

        complete = events.find { |e| e[:type] == "complete" }
        expect(complete[:data]).to have_key(:provider_errors)
      end

      it "includes has_more flag in complete event" do
        writes = sent_events
        aggregator.search
        events = parse_events(writes)

        complete = events.find { |e| e[:type] == "complete" }
        expect(complete[:data]).to have_key(:has_more)
      end

      it "caches the results" do
        aggregator.search
        cached = HotelCache.get_search(location: "Paris, France", keywords: [ "romantic" ])
        expect(cached).to be_present
      end
    end

    context "when TripAdvisor returns no results (Google fallback)" do
      before do
        service = instance_double(TripadvisorService)
        allow(TripadvisorService).to receive(:new).and_return(service)
        allow(service).to receive(:search_hotels).and_return([])

        google_service = instance_double(GooglePlacesService)
        allow(GooglePlacesService).to receive(:new).and_return(google_service)
        allow(google_service).to receive(:geocode).and_return({
                                                                latitude: 48.86, longitude: 2.35,
                                                                formatted_address: "Paris, France", place_id: "ChIJ_geo"
                                                              })
        allow(google_service).to receive(:search_hotels).and_return([ {
                                                                       source: "google", external_id: "ChIJ_fallback", name: "Fallback Hotel",
                                                                       address: "123 Fallback St", latitude: 48.86, longitude: 2.35,
                                                                       rating: 4.2, total_ratings: 500, image_url: nil,
                                                                       price_per_night: nil, price_level: nil, url: nil
                                                                     } ])

        stub_request(:get, /booking-com15\.p\.rapidapi\.com.*searchDestination/)
          .to_return(
            status: 200,
            headers: { "Content-Type" => "application/json" },
            body: { status: true, data: [] }.to_json
          )
      end

      it "sends tripadvisor_fallback progress event" do
        writes = sent_events
        aggregator.search
        events = parse_events(writes)

        fallback = events.find { |e| e[:type] == "progress" && e[:data][:stage] == "tripadvisor_fallback" }
        expect(fallback).to be_present
      end

      it "includes TripAdvisor in provider_errors" do
        writes = sent_events
        aggregator.search
        events = parse_events(writes)

        complete = events.find { |e| e[:type] == "complete" }
        expect(complete[:data][:provider_errors]).to include("TripAdvisor")
      end

      it "returns Google fallback results" do
        writes = sent_events
        aggregator.search
        events = parse_events(writes)

        complete = events.find { |e| e[:type] == "complete" }
        expect(complete[:data][:hotels].first[:name]).to eq("Fallback Hotel")
        expect(complete[:data][:hotels].first[:sources]).to include("google")
      end
    end

    context "when both TripAdvisor and Google return no results" do
      before do
        service = instance_double(TripadvisorService)
        allow(TripadvisorService).to receive(:new).and_return(service)
        allow(service).to receive(:search_hotels).and_return([])

        google_service = instance_double(GooglePlacesService)
        allow(GooglePlacesService).to receive(:new).and_return(google_service)
        allow(google_service).to receive(:geocode).and_return(nil)
      end

      it "sends complete event with empty results" do
        writes = sent_events
        aggregator.search
        events = parse_events(writes)

        complete = events.find { |e| e[:type] == "complete" }
        expect(complete[:data][:hotels]).to eq([])
        expect(complete[:data][:count]).to eq(0)
      end
    end

    context "when an error occurs during search" do
      before do
        allow(TripadvisorService).to receive(:new).and_raise(StandardError, "API exploded")
      end

      it "does not crash" do
        expect { aggregator.search }.not_to raise_error
      end
    end

    context "when stream disconnects during search" do
      before do
        allow(stream).to receive(:write).and_raise(IOError, "closed stream")

        service = instance_double(TripadvisorService)
        allow(TripadvisorService).to receive(:new).and_return(service)
        allow(service).to receive(:search_hotels).and_return([])

        google_service = instance_double(GooglePlacesService)
        allow(GooglePlacesService).to receive(:new).and_return(google_service)
        allow(google_service).to receive(:geocode).and_return(nil)
      end

      it "handles IOError gracefully" do
        expect { aggregator.search }.not_to raise_error
      end
    end
  end

  describe "#send_event (private)" do
    it "writes SSE formatted event to stream" do
      expect(stream).to receive(:write).with("event: progress\n")
      expect(stream).to receive(:write).with(a_string_matching(/"stage":"test"/))

      aggregator.send(:send_event, "progress", { stage: "test", message: "hello" })
    end

    it "handles IOError when stream is closed" do
      allow(stream).to receive(:write).and_raise(IOError, "closed")

      expect { aggregator.send(:send_event, "progress", { stage: "test" }) }.not_to raise_error
    end
  end
end
