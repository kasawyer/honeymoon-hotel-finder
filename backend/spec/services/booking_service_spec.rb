require "rails_helper"

RSpec.describe BookingService do
  let(:service) { described_class.new }

  before do
    allow(ENV).to receive(:fetch).with("RAPIDAPI_KEY").and_return("test_key")
  end

  describe "#search_hotels" do
    it "resolves destination and returns normalized hotels" do
      # Stub destination lookup
      stub_request(:get, /booking-com.*locations/)
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: [{ "dest_id" => "-1456928", "dest_type" => "city" }].to_json
        )

      # Stub hotel search
      stub_request(:get, /booking-com.*search/)
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: {
            result: [{
              hotel_id: 12345,
              hotel_name: "Honeymoon Palace",
              address: "123 Love Lane",
              city: "Paris",
              country_trans: "France",
              latitude: 48.86,
              longitude: 2.35,
              review_score: 9.0,
              review_nr: 500,
              main_photo_url: "https://example.com/photo_square60.jpg",
              url: "https://booking.com/hotel/12345",
              composite_price_breakdown: {
                gross_amount_per_night: { value: 250.00 }
              }
            }]
          }.to_json
        )

      results = service.search_hotels(
        location: "Paris",
        check_in: "2025-06-01",
        check_out: "2025-06-04",
        keywords: ["honeymoon"]
      )

      expect(results.length).to eq(1)
      hotel = results.first
      expect(hotel[:source]).to eq("booking")
      expect(hotel[:name]).to eq("Honeymoon Palace")
      expect(hotel[:rating]).to eq(4.5) # 9.0 / 2
      expect(hotel[:price_per_night]).to eq(250.00)
      expect(hotel[:image_url]).to include("square300") # upgraded from square60
    end

    it "returns empty array when destination not found" do
      stub_request(:get, /booking-com.*locations/)
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: [].to_json
        )

      results = service.search_hotels(
        location: "Nonexistent Place",
        check_in: "2025-06-01",
        check_out: "2025-06-04",
        keywords: []
      )
      expect(results).to eq([])
    end

    it "returns empty array on API error" do
      stub_request(:get, /booking-com.*locations/)
        .to_return(status: 500, body: "Internal Server Error")

      results = service.search_hotels(
        location: "Paris",
        check_in: "2025-06-01",
        check_out: "2025-06-04",
        keywords: []
      )
      expect(results).to eq([])
    end
  end
end
