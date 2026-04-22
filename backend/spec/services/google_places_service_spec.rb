# spec/services/google_places_service_spec.rb
require "rails_helper"

RSpec.describe GooglePlacesService do
  let(:service) { described_class.new }

  before do
    allow(ENV).to receive(:fetch).with("GOOGLE_MAPS_API_KEY").and_return("test_key")
  end

  describe "#geocode" do
    it "returns coordinates for a valid location" do
      stub_request(:post, "https://places.googleapis.com/v1/places:searchText")
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: {
            places: [ {
                       id: "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",
                       location: { latitude: 48.8566, longitude: 2.3522 },
                       formattedAddress: "Paris, France",
                       displayName: { text: "Paris", languageCode: "en" }
                     } ]
          }.to_json
        )

      result = service.geocode("Paris, France")

      expect(result[:latitude]).to eq(48.8566)
      expect(result[:longitude]).to eq(2.3522)
      expect(result[:formatted_address]).to eq("Paris, France")
      expect(result[:place_id]).to eq("ChIJD7fiBh9u5kcRYJSMaMOCCwQ")
    end

    it "returns nil when no places found" do
      stub_request(:post, "https://places.googleapis.com/v1/places:searchText")
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: { places: [] }.to_json
        )

      expect(service.geocode("asdfghjkl")).to be_nil
    end

    it "returns nil when response has no places key" do
      stub_request(:post, "https://places.googleapis.com/v1/places:searchText")
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: {}.to_json
        )

      expect(service.geocode("nowhere")).to be_nil
    end
  end

  describe "#search_hotels" do
    it "returns normalized hotel data" do
      stub_request(:post, "https://places.googleapis.com/v1/places:searchNearby")
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: {
            places: [ {
                       id: "abc123",
                       displayName: { text: "Romantic Paris Hotel", languageCode: "en" },
                       formattedAddress: "1 Rue de Rivoli, Paris, France",
                       location: { latitude: 48.86, longitude: 2.35 },
                       rating: 4.5,
                       userRatingCount: 1200,
                       priceLevel: "PRICE_LEVEL_MODERATE",
                       photos: [ {
                                  name: "places/abc123/photos/photo_ref_123"
                                } ]
                     } ]
          }.to_json
        )

      results = service.search_hotels(
        latitude: 48.8566,
        longitude: 2.3522,
        keywords: [ "romantic" ]
      )

      expect(results.length).to eq(1)
      hotel = results.first
      expect(hotel[:source]).to eq("google")
      expect(hotel[:external_id]).to eq("abc123")
      expect(hotel[:name]).to eq("Romantic Paris Hotel")
      expect(hotel[:address]).to eq("1 Rue de Rivoli, Paris, France")
      expect(hotel[:latitude]).to eq(48.86)
      expect(hotel[:longitude]).to eq(2.35)
      expect(hotel[:rating]).to eq(4.5)
      expect(hotel[:total_ratings]).to eq(1200)
      expect(hotel[:image_url]).to include("places/abc123/photos/photo_ref_123")
      expect(hotel[:image_url]).to include("maxWidthPx=400")
    end

    it "returns all results when keyword filter matches nothing" do
      stub_request(:post, "https://places.googleapis.com/v1/places:searchNearby")
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: {
            places: [ {
                       id: "xyz789",
                       displayName: { text: "Grand Hotel", languageCode: "en" },
                       formattedAddress: "Paris",
                       location: { latitude: 48.86, longitude: 2.35 },
                       rating: 4.0,
                       userRatingCount: 500
                     } ]
          }.to_json
        )

      results = service.search_hotels(
        latitude: 48.8566,
        longitude: 2.3522,
        keywords: [ "nonexistentkeyword" ]
      )

      # Falls back to all results when no keyword matches
      expect(results.length).to eq(1)
      expect(results.first[:name]).to eq("Grand Hotel")
    end

    it "returns empty array when no places found" do
      stub_request(:post, "https://places.googleapis.com/v1/places:searchNearby")
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: { places: [] }.to_json
        )

      results = service.search_hotels(
        latitude: 48.8566,
        longitude: 2.3522,
        keywords: [ "romantic" ]
      )

      expect(results).to eq([])
    end

    it "handles missing photos gracefully" do
      stub_request(:post, "https://places.googleapis.com/v1/places:searchNearby")
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: {
            places: [ {
                       id: "no_photo",
                       displayName: { text: "Budget Romantic Inn", languageCode: "en" },
                       formattedAddress: "Paris",
                       location: { latitude: 48.86, longitude: 2.35 },
                       rating: 3.5,
                       userRatingCount: 50
                     } ]
          }.to_json
        )

      results = service.search_hotels(
        latitude: 48.8566,
        longitude: 2.3522,
        keywords: [ "romantic" ]
      )

      expect(results.first[:image_url]).to be_nil
    end
  end

  describe "#autocomplete" do
    it "returns city suggestions" do
      stub_request(:post, "https://places.googleapis.com/v1/places:autocomplete")
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: {
            suggestions: [
              {
                placePrediction: {
                  placeId: "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",
                  text: { text: "Paris, France", matches: [] },
                  structuredFormat: {
                    mainText: { text: "Paris" },
                    secondaryText: { text: "France" }
                  }
                }
              },
              {
                placePrediction: {
                  placeId: "ChIJIbIRTkRDtocRnHaz_aUH7bk",
                  text: { text: "Paris, TX, USA", matches: [] },
                  structuredFormat: {
                    mainText: { text: "Paris" },
                    secondaryText: { text: "TX, USA" }
                  }
                }
              }
            ]
          }.to_json
        )

      results = service.autocomplete("Paris")

      expect(results.length).to eq(2)
      expect(results.first[:place_id]).to eq("ChIJD7fiBh9u5kcRYJSMaMOCCwQ")
      expect(results.first[:description]).to eq("Paris, France")
      expect(results.last[:description]).to eq("Paris, TX, USA")
    end

    it "returns empty array when no suggestions" do
      stub_request(:post, "https://places.googleapis.com/v1/places:autocomplete")
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: { suggestions: [] }.to_json
        )

      expect(service.autocomplete("zzzzz")).to eq([])
    end

    it "returns empty array when response has no suggestions key" do
      stub_request(:post, "https://places.googleapis.com/v1/places:autocomplete")
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: {}.to_json
        )

      expect(service.autocomplete("zzzzz")).to eq([])
    end

    it "skips non-place suggestions like query predictions" do
      stub_request(:post, "https://places.googleapis.com/v1/places:autocomplete")
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: {
            suggestions: [
              {
                placePrediction: {
                  placeId: "abc",
                  text: { text: "Paris, France" }
                }
              },
              {
                queryPrediction: {
                  text: { text: "paris hotels" }
                }
              }
            ]
          }.to_json
        )

      results = service.autocomplete("Paris")

      # Should only include the place prediction, not the query prediction
      expect(results.length).to eq(1)
      expect(results.first[:description]).to eq("Paris, France")
    end
  end

  describe "error handling" do
    it "raises ApiError on non-2xx responses" do
      stub_request(:post, "https://places.googleapis.com/v1/places:autocomplete")
        .to_return(
          status: 403,
          headers: { "Content-Type" => "application/json" },
          body: { error: { message: "API key not valid" } }.to_json
        )

      expect {
        service.autocomplete("Paris")
      }.to raise_error(ApiClient::ApiError, /Google Places API returned 403/)
    end
  end
end
