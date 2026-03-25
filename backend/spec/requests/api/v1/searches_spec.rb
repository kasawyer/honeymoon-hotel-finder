require "rails_helper"

RSpec.describe "POST /api/v1/searches", type: :request do
  let(:mock_results) do
    [{ source: "google", name: "Test Hotel", rating: 4.5 }]
  end

  before do
    aggregator = instance_double(HotelAggregator, search: mock_results)
    allow(aggregator).to receive(:send).with(:build_cache_key).and_return("romantic")
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
    ).and_return(instance_double(HotelAggregator, search: mock_results).tap { |a|
      allow(a).to receive(:send).with(:build_cache_key).and_return("romantic,spa")
    })

    post "/api/v1/searches", params: { location: "Bali", keywords: "romantic,spa" }, as: :json
    expect(response).to have_http_status(:ok)
  end

  it "accepts keywords as an array" do
    expect(HotelAggregator).to receive(:new).with(
      hash_including(keywords: ["luxury", "honeymoon"])
    ).and_return(instance_double(HotelAggregator, search: mock_results).tap { |a|
      allow(a).to receive(:send).with(:build_cache_key).and_return("honeymoon,luxury")
    })

    post "/api/v1/searches", params: { location: "Bali", keywords: ["luxury", "honeymoon"] }, as: :json
    expect(response).to have_http_status(:ok)
  end
end
