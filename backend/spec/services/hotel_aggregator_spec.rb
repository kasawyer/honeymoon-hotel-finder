# spec/requests/api/v1/searches_spec.rb
require "rails_helper"

RSpec.describe "POST /api/v1/searches", type: :request do
  let(:mock_results) do
    [{
       name: "Test Hotel",
       combined_rating: 4.5,
       total_reviews: 5000,
       sources: ["tripadvisor", "google", "booking"],
       source_ratings: [
         { source: "tripadvisor", rating: 4.5, count: 2000 },
         { source: "google", rating: 4.6, count: 2500 },
         { source: "booking", rating: 4.3, count: 500 }
       ],
       price_per_night: 250.0,
       image_url: "https://example.com/photo.jpg",
       url: "https://booking.com/hotel/test"
     }]
  end

  before do
    aggregator = instance_double(HotelAggregator, search: mock_results)
    allow(HotelAggregator).to receive(:new).and_return(aggregator)
  end

  it "returns hotel results for a valid location" do
    post "/api/v1/searches", params: { location: "Paris" }, as: :json

    expect(response).to have_http_status(:ok)
    body = JSON.parse(response.body)
    expect(body["location"]).to eq("Paris")
    expect(body["hotels"]).to be_an(Array)
    expect(body["count"]).to eq(1)
  end

  it "returns 422 when location is missing" do
    post "/api/v1/searches", params: {}, as: :json

    expect(response).to have_http_status(:unprocessable_entity)
    body = JSON.parse(response.body)
    expect(body["error"]).to include("location")
  end

  it "accepts keywords as a comma-separated string" do
    expect(HotelAggregator).to receive(:new).with(
      hash_including(keywords: ["romantic", "spa"])
    ).and_return(instance_double(HotelAggregator, search: mock_results))

    post "/api/v1/searches", params: { location: "Bali", keywords: "romantic,spa" }, as: :json
    expect(response).to have_http_status(:ok)
  end

  it "accepts keywords as an array" do
    expect(HotelAggregator).to receive(:new).with(
      hash_including(keywords: ["luxury", "honeymoon"])
    ).and_return(instance_double(HotelAggregator, search: mock_results))

    post "/api/v1/searches", params: { location: "Bali", keywords: ["luxury", "honeymoon"] }, as: :json
    expect(response).to have_http_status(:ok)
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