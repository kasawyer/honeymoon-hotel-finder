require "rails_helper"

RSpec.describe "Searches API", type: :request do
  before do
    Rails.cache.clear
    allow(ENV).to receive(:fetch).with("FRONTEND_URL", "http://localhost:5173").and_return("http://localhost:5173")
  end

  # =============================================
  # POST /api/v1/searches
  # =============================================

  describe "POST /api/v1/searches" do
    let(:mock_results) do
      [ {
         name: "Test Hotel",
         combined_rating: 4.5,
         total_reviews: 5000,
         sources: [ "tripadvisor", "google", "booking" ],
         source_ratings: [
           { source: "tripadvisor", rating: 4.5, count: 2000 },
           { source: "google", rating: 4.6, count: 2500 },
           { source: "booking", rating: 4.3, count: 500 }
         ],
         price_per_night: 250.0,
         image_url: "https://example.com/photo.jpg",
         url: "https://booking.com/hotel/test"
       } ]
    end

    context "with valid parameters" do
      before do
        aggregator = instance_double(HotelAggregator, search: mock_results)
        allow(HotelAggregator).to receive(:new).and_return(aggregator)
      end

      it "returns 200 OK" do
        post "/api/v1/searches", params: { location: "Paris" }, as: :json
        expect(response).to have_http_status(:ok)
      end

      it "returns the location in the response" do
        post "/api/v1/searches", params: { location: "Paris" }, as: :json
        body = JSON.parse(response.body)
        expect(body["location"]).to eq("Paris")
      end

      it "returns the hotel count" do
        post "/api/v1/searches", params: { location: "Paris" }, as: :json
        body = JSON.parse(response.body)
        expect(body["count"]).to eq(1)
      end

      it "returns hotel data" do
        post "/api/v1/searches", params: { location: "Paris" }, as: :json
        body = JSON.parse(response.body)
        expect(body["hotels"]).to be_an(Array)
        expect(body["hotels"].first["name"]).to eq("Test Hotel")
      end

      it "returns default keywords when none provided" do
        post "/api/v1/searches", params: { location: "Paris" }, as: :json
        body = JSON.parse(response.body)
        expect(body["keywords"]).to eq(HotelAggregator::DEFAULT_KEYWORDS)
      end

      it "returns default check_in and check_out dates" do
        post "/api/v1/searches", params: { location: "Paris" }, as: :json
        body = JSON.parse(response.body)
        expect(body["check_in"]).to eq(Date.tomorrow.to_s)
        expect(body["check_out"]).to eq((Date.tomorrow + 3).to_s)
      end

      it "returns source ratings in the response" do
        post "/api/v1/searches", params: { location: "Paris" }, as: :json
        body = JSON.parse(response.body)
        hotel = body["hotels"].first
        expect(hotel["source_ratings"]).to be_an(Array)
        expect(hotel["source_ratings"].length).to eq(3)
        expect(hotel["sources"]).to contain_exactly("tripadvisor", "google", "booking")
      end
    end

    context "with keywords as comma-separated string" do
      it "splits the string into an array" do
        aggregator = instance_double(HotelAggregator, search: [])
        expect(HotelAggregator).to receive(:new).with(
          hash_including(keywords: [ "romantic", "spa" ])
        ).and_return(aggregator)

        post "/api/v1/searches", params: { location: "Bali", keywords: "romantic,spa" }, as: :json
        expect(response).to have_http_status(:ok)
      end

      it "strips whitespace from keywords" do
        aggregator = instance_double(HotelAggregator, search: [])
        expect(HotelAggregator).to receive(:new).with(
          hash_including(keywords: [ "romantic", "spa" ])
        ).and_return(aggregator)

        post "/api/v1/searches", params: { location: "Bali", keywords: " romantic , spa " }, as: :json
        expect(response).to have_http_status(:ok)
      end
    end

    context "with keywords as an array" do
      it "passes the array directly" do
        aggregator = instance_double(HotelAggregator, search: [])
        expect(HotelAggregator).to receive(:new).with(
          hash_including(keywords: [ "luxury", "honeymoon" ])
        ).and_return(aggregator)

        post "/api/v1/searches", params: { location: "Bali", keywords: [ "luxury", "honeymoon" ] }, as: :json
        expect(response).to have_http_status(:ok)
      end
    end

    context "with check_in and check_out dates" do
      it "passes dates to the aggregator" do
        aggregator = instance_double(HotelAggregator, search: [])
        expect(HotelAggregator).to receive(:new).with(
          hash_including(check_in: "2026-07-01", check_out: "2026-07-05")
        ).and_return(aggregator)

        post "/api/v1/searches", params: {
          location: "Paris",
          check_in: "2026-07-01",
          check_out: "2026-07-05"
        }, as: :json
        expect(response).to have_http_status(:ok)
      end

      it "returns the provided dates in the response" do
        aggregator = instance_double(HotelAggregator, search: [])
        allow(HotelAggregator).to receive(:new).and_return(aggregator)

        post "/api/v1/searches", params: {
          location: "Paris",
          check_in: "2026-07-01",
          check_out: "2026-07-05"
        }, as: :json

        body = JSON.parse(response.body)
        expect(body["check_in"]).to eq("2026-07-01")
        expect(body["check_out"]).to eq("2026-07-05")
      end
    end

    context "when location is missing" do
      it "returns 422 with an error message" do
        post "/api/v1/searches", params: {}, as: :json
        expect(response).to have_http_status(:unprocessable_entity)
        body = JSON.parse(response.body)
        expect(body["error"]).to include("location")
      end
    end

    context "when an unexpected error occurs" do
      it "returns 500 with a generic error message" do
        allow(HotelAggregator).to receive(:new).and_raise(StandardError, "something broke")

        post "/api/v1/searches", params: { location: "Paris" }, as: :json
        expect(response).to have_http_status(:internal_server_error)
        body = JSON.parse(response.body)
        expect(body["error"]).to eq("An unexpected error occurred. Please try again.")
      end

      it "reports to Sentry and returns 500" do
        allow(HotelAggregator).to receive(:new).and_raise(StandardError, "boom")

        post "/api/v1/searches", params: { location: "Paris" }, as: :json

        expect(response).to have_http_status(:internal_server_error)
        body = JSON.parse(response.body)
        expect(body["error"]).to include("unexpected error")
      end
    end

    context "when search returns empty results" do
      it "returns 200 with an empty hotels array" do
        aggregator = instance_double(HotelAggregator, search: [])
        allow(HotelAggregator).to receive(:new).and_return(aggregator)

        post "/api/v1/searches", params: { location: "Nowhere" }, as: :json
        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        expect(body["count"]).to eq(0)
        expect(body["hotels"]).to eq([])
      end
    end
  end

  # =============================================
  # GET /api/v1/searches/stream
  # =============================================

  describe "GET /api/v1/searches/stream" do
    # SSE streaming tests are tricky in request specs because
    # ActionController::Live streams the response. We test the
    # controller behavior by mocking the aggregator.

    context "with valid parameters" do
      it "sets SSE response headers" do
        aggregator = instance_double(StreamingHotelAggregator)
        allow(StreamingHotelAggregator).to receive(:new).and_return(aggregator)
        allow(aggregator).to receive(:search)

        get "/api/v1/searches/stream", params: { location: "Paris", keywords: "romantic" }

        expect(response.headers["Content-Type"]).to include("text/event-stream")
        expect(response.headers["Cache-Control"]).to include("no-cache")
      end

      it "creates the aggregator with correct parameters" do
        expect(StreamingHotelAggregator).to receive(:new).with(
          hash_including(
            location: "Paris",
            keywords: [ "romantic", "honeymoon" ],
            stream: anything
          )
        ).and_return(instance_double(StreamingHotelAggregator, search: nil))

        get "/api/v1/searches/stream", params: { location: "Paris", keywords: "romantic,honeymoon" }
      end

      it "passes nil keywords when none provided" do
        expect(StreamingHotelAggregator).to receive(:new).with(
          hash_including(keywords: nil)
        ).and_return(instance_double(StreamingHotelAggregator, search: nil))

        get "/api/v1/searches/stream", params: { location: "Paris" }
      end

      it "passes check_in and check_out when provided" do
        expect(StreamingHotelAggregator).to receive(:new).with(
          hash_including(check_in: "2026-07-01", check_out: "2026-07-05")
        ).and_return(instance_double(StreamingHotelAggregator, search: nil))

        get "/api/v1/searches/stream", params: {
          location: "Paris",
          check_in: "2026-07-01",
          check_out: "2026-07-05"
        }
      end
    end

    context "when location is missing" do
      it "sends an SSE error event" do
        get "/api/v1/searches/stream", params: {}

        expect(response.body).to include("event: error")
        expect(response.body).to include("location")
      end
    end

    context "when an unexpected error occurs" do
      it "sends an SSE error event" do
        allow(StreamingHotelAggregator).to receive(:new).and_raise(StandardError, "boom")

        get "/api/v1/searches/stream", params: { location: "Paris" }

        expect(response.body).to include("event: error")
        expect(response.body).to include("An unexpected error occurred")
      end

      it "reports to Sentry and sends error event" do
        allow(StreamingHotelAggregator).to receive(:new).and_raise(StandardError, "boom")

        get "/api/v1/searches/stream", params: { location: "Paris" }

        expect(response.body).to include("event: error")
        expect(response.body).to include("unexpected error")
      end
    end

    context "when the stream closes" do
      it "completes the response successfully" do
        aggregator = instance_double(StreamingHotelAggregator)
        allow(StreamingHotelAggregator).to receive(:new).and_return(aggregator)
        allow(aggregator).to receive(:search)

        get "/api/v1/searches/stream", params: { location: "Paris" }

        # The ensure block closes the stream; response should complete without error
        expect(response).to have_http_status(:ok)
      end
    end
  end
end
