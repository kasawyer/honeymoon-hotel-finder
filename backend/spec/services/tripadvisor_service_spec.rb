# spec/services/tripadvisor_service_spec.rb
require "rails_helper"

RSpec.describe TripadvisorService do
  let(:service) { described_class.new }

  before do
    allow(ENV).to receive(:fetch).with("RAPIDAPI_KEY").and_return("test_key")
  end

  describe "#search_hotels" do
    let(:location_stub) do
      stub_request(:get, /tripadvisor16.*searchLocation/)
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: {
            status: true,
            message: "Success",
            timestamp: 1774466935110,
            data: [{
                     title: "<b>Paris</b>",
                     geoId: 187147,
                     documentId: "loc;187147;g187147",
                     trackingItems: "CITY",
                     secondaryText: "Ile-de-France, France"
                   }]
          }.to_json
        )
    end

    let(:hotel_results) do
      [{
         id: "197528",
         title: "1. Le Royal Monceau - Raffles Paris",
         primaryInfo: "Free breakfast available",
         secondaryInfo: "8th Arr. - Élysée",
         badge: { size: "SMALL", type: "TRAVELLER_CHOICE", year: "2025" },
         bubbleRating: { count: "(1,829)", rating: 4.7 },
         isSponsored: false,
         provider: "Raffles",
         priceForDisplay: "$1,660",
         strikethroughPrice: nil,
         priceDetails: "Free cancellation",
         cardPhotos: [{
                        __typename: "AppPresentation_PhotoItem",
                        sizes: {
                          __typename: "AppPresentation_PhotoItemSizeDynamic",
                          maxHeight: 4859,
                          maxWidth: 7282,
                          urlTemplate: "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/31/68/6d/73/facade.jpg?w={width}&h={height}&s=1"
                        }
                      }],
         commerceInfo: {
           externalUrl: "https://www.tripadvisor.in/Commerce?p=Accor&src=171740821&geo=197528",
           provider: "Raffles",
           priceForDisplay: { text: "$1,660" },
           details: { text: "Free cancellation" },
           commerceSummary: { text: "View all 8 deals from $1,660" }
         }
       }]
    end

    it "resolves geo ID and returns normalized hotels" do
      location_stub

      stub_request(:get, /tripadvisor16.*searchHotels/)
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: {
            status: true,
            message: "Success",
            timestamp: 1774466935110,
            data: { data: hotel_results }
          }.to_json
        )

      results = service.search_hotels(
        location: "Paris",
        check_in: "2026-04-01",
        check_out: "2026-04-04",
        keywords: ["romantic"]
      )

      expect(results.length).to eq(1)
      hotel = results.first
      expect(hotel[:source]).to eq("tripadvisor")
      expect(hotel[:external_id]).to eq("197528")
      expect(hotel[:name]).to eq("Le Royal Monceau - Raffles Paris")
      expect(hotel[:address]).to eq("8th Arr. - Élysée")
      expect(hotel[:rating]).to eq(4.7)
      expect(hotel[:total_ratings]).to eq(1829)
      expect(hotel[:price_per_night]).to eq(1660.0)
      expect(hotel[:image_url]).to include("w=400")
      expect(hotel[:image_url]).to include("h=300")
      expect(hotel[:url]).to include("tripadvisor.in/Commerce")
    end

    it "strips the number prefix from hotel titles" do
      location_stub

      stub_request(:get, /tripadvisor16.*searchHotels/)
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: {
            status: true,
            message: "Success",
            data: {
              data: [
                hotel_results.first.merge(title: "14. Romantic Sunset Hotel"),
                hotel_results.first.merge(id: "999", title: "3. Grand Palace")
              ]
            }
          }.to_json
        )

      results = service.search_hotels(
        location: "Paris",
        check_in: "2026-04-01",
        check_out: "2026-04-04",
        keywords: ["romantic"]
      )

      # Only the one matching "romantic" should be returned
      expect(results.length).to eq(1)
      expect(results.first[:name]).to eq("Romantic Sunset Hotel")
    end

    it "falls back to all results when keyword filter matches nothing" do
      location_stub

      stub_request(:get, /tripadvisor16.*searchHotels/)
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: {
            status: true,
            message: "Success",
            data: { data: hotel_results }
          }.to_json
        )

      results = service.search_hotels(
        location: "Paris",
        check_in: "2026-04-01",
        check_out: "2026-04-04",
        keywords: ["nonexistentkeyword"]
      )

      # Should return all hotels as fallback
      expect(results.length).to eq(1)
      expect(results.first[:name]).to eq("Le Royal Monceau - Raffles Paris")
    end

    it "returns empty array when geo ID not found" do
      stub_request(:get, /tripadvisor16.*searchLocation/)
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: {
            status: true,
            message: "Success",
            data: []
          }.to_json
        )

      results = service.search_hotels(
        location: "Nonexistent Place",
        check_in: "2026-04-01",
        check_out: "2026-04-04",
        keywords: []
      )

      expect(results).to eq([])
    end

    it "returns empty array on API error" do
      stub_request(:get, /tripadvisor16.*searchLocation/)
        .to_return(status: 500, body: "Internal Server Error")

      results = service.search_hotels(
        location: "Paris",
        check_in: "2026-04-01",
        check_out: "2026-04-04",
        keywords: []
      )

      expect(results).to eq([])
    end

    it "handles missing photos gracefully" do
      location_stub

      hotel_no_photos = hotel_results.first.merge(cardPhotos: [])

      stub_request(:get, /tripadvisor16.*searchHotels/)
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: {
            status: true,
            message: "Success",
            data: { data: [hotel_no_photos] }
          }.to_json
        )

      results = service.search_hotels(
        location: "Paris",
        check_in: "2026-04-01",
        check_out: "2026-04-04",
        keywords: []
      )

      expect(results.first[:image_url]).to be_nil
    end

    it "handles missing price gracefully" do
      location_stub

      hotel_no_price = hotel_results.first.merge(
        priceForDisplay: nil,
        commerceInfo: hotel_results.first[:commerceInfo].merge(
          priceForDisplay: nil
        )
      )

      stub_request(:get, /tripadvisor16.*searchHotels/)
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: {
            status: true,
            message: "Success",
            data: { data: [hotel_no_price] }
          }.to_json
        )

      results = service.search_hotels(
        location: "Paris",
        check_in: "2026-04-01",
        check_out: "2026-04-04",
        keywords: []
      )

      expect(results.first[:price_per_night]).to be_nil
    end

    it "parses comma-formatted prices correctly" do
      location_stub

      stub_request(:get, /tripadvisor16.*searchHotels/)
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: {
            status: true,
            message: "Success",
            data: {
              data: [hotel_results.first.merge(priceForDisplay: "$2,450")]
            }
          }.to_json
        )

      results = service.search_hotels(
        location: "Paris",
        check_in: "2026-04-01",
        check_out: "2026-04-04",
        keywords: []
      )

      expect(results.first[:price_per_night]).to eq(2450.0)
    end
  end
end
