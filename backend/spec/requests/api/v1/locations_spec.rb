require "rails_helper"

RSpec.describe "GET /api/v1/locations", type: :request do
  before do
    service = instance_double(GooglePlacesService)
    allow(GooglePlacesService).to receive(:new).and_return(service)
    allow(service).to receive(:autocomplete).and_return([
      { place_id: "abc", description: "Paris, France" }
    ])
  end

  it "returns location suggestions" do
    get "/api/v1/locations", params: { query: "Paris" }

    expect(response).to have_http_status(:ok)
    body = JSON.parse(response.body)
    expect(body["locations"]).to be_an(Array)
    expect(body["locations"].first["description"]).to eq("Paris, France")
  end

  it "returns empty for short queries" do
    get "/api/v1/locations", params: { query: "P" }

    body = JSON.parse(response.body)
    expect(body["locations"]).to eq([])
  end

  it "returns 422 when query is missing" do
    get "/api/v1/locations"

    expect(response).to have_http_status(:unprocessable_entity)
  end
end
