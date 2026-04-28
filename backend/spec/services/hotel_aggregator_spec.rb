require "rails_helper"

RSpec.describe HotelAggregator do
  let(:aggregator) do
    described_class.new(
      location: "Paris, France",
      check_in: "2026-06-01",
      check_out: "2026-06-04",
      keywords: [ "romantic" ]
    )
  end

  # --- Shared test data ---

  let(:ta_hotel) do
    {
      source: "tripadvisor",
      external_id: "197528",
      name: "Le Bristol Paris",
      address: "8th Arr. - Élysée",
      latitude: nil,
      longitude: nil,
      rating: 4.7,
      total_ratings: 1829,
      image_url: "https://dynamic-media-cdn.tripadvisor.com/photo.jpg?w=400&h=300",
      price_per_night: 1660.0,
      url: "https://www.tripadvisor.in/Commerce?geo=197528"
    }
  end

  let(:ta_hotel_2) do
    {
      source: "tripadvisor",
      external_id: "228799",
      name: "Novotel Paris Les Halles",
      address: "1st Arr. - Louvre",
      latitude: nil,
      longitude: nil,
      rating: 4.3,
      total_ratings: 7393,
      image_url: "https://dynamic-media-cdn.tripadvisor.com/photo2.jpg?w=400&h=300",
      price_per_night: 707.0,
      url: "https://www.tripadvisor.in/Commerce?geo=228799"
    }
  end

  before do
    allow(ENV).to receive(:fetch).with("GOOGLE_MAPS_API_KEY").and_return("test_google_key")
    allow(ENV).to receive(:fetch).with("RAPIDAPI_KEY").and_return("test_rapid_key")
  end

  # --- Stub helpers ---

  def stub_tripadvisor(results)
    service = instance_double(TripadvisorService)
    allow(TripadvisorService).to receive(:new).and_return(service)
    allow(service).to receive(:search_hotels).and_return(results)
  end

  def stub_google_lookup_success(hotel_name, rating:, count:)
    stub_request(:post, "https://places.googleapis.com/v1/places:searchText")
      .with(body: hash_including("textQuery" => /#{Regexp.escape(hotel_name)}/i))
      .to_return(
        status: 200,
        headers: { "Content-Type" => "application/json" },
        body: {
          places: [ {
                     id: "ChIJ_test",
                     displayName: { text: hotel_name, languageCode: "en" },
                     rating: rating,
                     userRatingCount: count,
                     formattedAddress: "123 Rue de Paris, 75001 Paris, France",
                     location: { latitude: 48.86, longitude: 2.35 },
                     photos: [ { name: "places/abc/photos/photo123" } ]
                   } ]
        }.to_json
      )
  end

  def stub_google_lookup_not_found(hotel_name)
    stub_request(:post, "https://places.googleapis.com/v1/places:searchText")
      .with(body: hash_including("textQuery" => /#{Regexp.escape(hotel_name)}/i))
      .to_return(
        status: 200,
        headers: { "Content-Type" => "application/json" },
        body: { places: [] }.to_json
      )
  end

  def stub_google_lookup_error(hotel_name)
    stub_request(:post, "https://places.googleapis.com/v1/places:searchText")
      .with(body: hash_including("textQuery" => /#{Regexp.escape(hotel_name)}/i))
      .to_return(status: 500, body: "Internal Server Error")
  end

  def stub_booking_lookup_success(hotel_name, dest_id:, review_score:, review_nr:)
    stub_request(:get, /booking-com15\.p\.rapidapi\.com.*searchDestination/)
      .to_return(
        status: 200,
        headers: { "Content-Type" => "application/json" },
        body: {
          status: true,
          message: "Success",
          data: [ {
                   search_type: "hotel",
                   dest_id: dest_id,
                   city_name: "Paris",
                   name: hotel_name,
                   cc1: "fr",
                   image_url: "https://cf.bstatic.com/xdata/images/hotel/150x150/123.jpg"
                 } ]
        }.to_json
      )

    stub_request(:get, /booking-com15\.p\.rapidapi\.com.*getHotelReviewScores/)
      .to_return(
        status: 200,
        headers: { "Content-Type" => "application/json" },
        body: {
          status: true,
          message: "Success",
          data: [ {
                   hotel_id: dest_id.to_i,
                   score_breakdown: [ {
                                       customer_type: "total",
                                       average_score: review_score.to_s,
                                       count: review_nr,
                                       from_year: 2023,
                                       question: [
                                         { question: "total", localized_question: "Total", score: review_score, count: review_nr }
                                       ]
                                     } ],
                   score_distribution: [],
                   score_percentage: []
                 } ]
        }.to_json
      )
  end

  def stub_booking_lookup_not_found(hotel_name)
    stub_request(:get, /booking-com15\.p\.rapidapi\.com.*searchDestination/)
      .to_return(
        status: 200,
        headers: { "Content-Type" => "application/json" },
        body: { status: true, message: "Success", data: [] }.to_json
      )
  end

  def stub_booking_lookup_error(hotel_name)
    stub_request(:get, /booking-com15\.p\.rapidapi\.com.*searchDestination/)
      .to_return(status: 500, body: "Internal Server Error")
  end

  def stub_booking_review_scores_missing_total(dest_id)
    stub_request(:get, /booking-com15\.p\.rapidapi\.com.*getHotelReviewScores/)
      .to_return(
        status: 200,
        headers: { "Content-Type" => "application/json" },
        body: {
          status: true,
          message: "Success",
          data: [ {
                   hotel_id: dest_id.to_i,
                   score_breakdown: [ {
                                       customer_type: "couple",
                                       average_score: "9.0",
                                       count: 5,
                                       question: []
                                     } ]
                 } ]
        }.to_json
      )
  end

  def stub_all_lookups_not_found
    stub_request(:post, /places\.googleapis\.com.*searchText/)
      .to_return(status: 200, headers: { "Content-Type" => "application/json" }, body: { places: [] }.to_json)
    stub_request(:get, /booking-com15\.p\.rapidapi\.com.*searchDestination/)
      .to_return(status: 200, headers: { "Content-Type" => "application/json" }, body: { status: true, data: [] }.to_json)
  end

  # ==========================================
  # Integration tests (full search flow)
  # ==========================================

  describe "#search" do
    context "when cache is empty and all APIs succeed" do
      before do
        stub_tripadvisor([ ta_hotel ])
        stub_google_lookup_success("Le Bristol Paris", rating: 4.7, count: 3174)
        stub_booking_lookup_success("Le Bristol Paris",
                                    dest_id: "1769895", review_score: 9.8, review_nr: 75)
      end

      it "returns hotels with ratings from all three sources" do
        results = aggregator.search
        expect(results.length).to eq(1)
        hotel = results.first
        expect(hotel[:name]).to eq("Le Bristol Paris")
        expect(hotel[:sources]).to contain_exactly("tripadvisor", "google", "booking")
        expect(hotel[:source_ratings].length).to eq(3)
      end

      it "includes TripAdvisor rating" do
        hotel = aggregator.search.first
        ta_rating = hotel[:source_ratings].find { |sr| sr[:source] == "tripadvisor" }
        expect(ta_rating[:rating]).to eq(4.7)
        expect(ta_rating[:count]).to eq(1829)
      end

      it "includes Google rating" do
        hotel = aggregator.search.first
        google_rating = hotel[:source_ratings].find { |sr| sr[:source] == "google" }
        expect(google_rating[:rating]).to eq(4.7)
        expect(google_rating[:count]).to eq(3174)
      end

      it "includes Booking rating normalized to 0-5 scale" do
        hotel = aggregator.search.first
        booking_rating = hotel[:source_ratings].find { |sr| sr[:source] == "booking" }
        expect(booking_rating[:rating]).to eq(4.9)
        expect(booking_rating[:count]).to eq(75)
      end

      it "computes weighted average rating" do
        hotel = aggregator.search.first
        expect(hotel[:combined_rating]).to be_between(4.6, 4.8)
      end

      it "sums total reviews across all sources" do
        hotel = aggregator.search.first
        expect(hotel[:total_reviews]).to eq(1829 + 3174 + 75)
      end

      it "uses Google image over TripAdvisor" do
        hotel = aggregator.search.first
        expect(hotel[:image_url]).to include("places.googleapis.com")
      end

      it "uses Google coordinates" do
        hotel = aggregator.search.first
        expect(hotel[:latitude]).to eq(48.86)
        expect(hotel[:longitude]).to eq(2.35)
      end

      it "caches the results" do
        aggregator.search
        cached = CachedSearch.find_valid(location: "Paris, France", query: "romantic")
        expect(cached).to be_present
        expect(cached.results.length).to eq(1)
      end
    end

    context "when Google lookup fails for a hotel" do
      before do
        stub_tripadvisor([ ta_hotel ])
        stub_google_lookup_not_found("Le Bristol Paris")
        stub_booking_lookup_success("Le Bristol Paris",
                                    dest_id: "1769895", review_score: 9.8, review_nr: 75)
      end

      it "returns the hotel with TripAdvisor and Booking ratings" do
        hotel = aggregator.search.first
        expect(hotel[:sources]).to contain_exactly("tripadvisor", "booking")
        expect(hotel[:source_ratings].length).to eq(2)
      end

      it "falls back to TripAdvisor image" do
        hotel = aggregator.search.first
        expect(hotel[:image_url]).to include("tripadvisor.com")
      end
    end

    context "when Google lookup errors" do
      before do
        stub_tripadvisor([ ta_hotel ])
        stub_google_lookup_error("Le Bristol Paris")
        stub_booking_lookup_success("Le Bristol Paris",
                                    dest_id: "1769895", review_score: 9.8, review_nr: 75)
      end

      it "still returns the hotel without crashing" do
        results = aggregator.search
        expect(results.length).to eq(1)
        expect(results.first[:sources]).to contain_exactly("tripadvisor", "booking")
      end
    end

    context "when Booking lookup fails" do
      before do
        stub_tripadvisor([ ta_hotel ])
        stub_google_lookup_success("Le Bristol Paris", rating: 4.7, count: 3174)
        stub_booking_lookup_not_found("Le Bristol Paris")
      end

      it "returns the hotel with TripAdvisor and Google ratings" do
        hotel = aggregator.search.first
        expect(hotel[:sources]).to contain_exactly("tripadvisor", "google")
        expect(hotel[:source_ratings].length).to eq(2)
      end

      it "falls back to TripAdvisor URL" do
        hotel = aggregator.search.first
        expect(hotel[:url]).to include("tripadvisor.in")
      end
    end

    context "when Booking lookup errors" do
      before do
        stub_tripadvisor([ ta_hotel ])
        stub_google_lookup_success("Le Bristol Paris", rating: 4.7, count: 3174)
        stub_booking_lookup_error("Le Bristol Paris")
      end

      it "still returns the hotel without crashing" do
        results = aggregator.search
        expect(results.length).to eq(1)
        expect(results.first[:sources]).to contain_exactly("tripadvisor", "google")
      end
    end

    context "when Booking has no 'total' customer type" do
      before do
        stub_tripadvisor([ ta_hotel ])
        stub_google_lookup_success("Le Bristol Paris", rating: 4.7, count: 3174)

        stub_request(:get, /booking-com15\.p\.rapidapi\.com.*searchDestination/)
          .to_return(
            status: 200,
            headers: { "Content-Type" => "application/json" },
            body: {
              status: true, data: [ {
                                     search_type: "hotel", dest_id: "1769895",
                                     city_name: "Paris", name: "Le Bristol Paris", cc1: "fr",
                                     image_url: "https://example.com/img.jpg"
                                   } ]
            }.to_json
          )
        stub_booking_review_scores_missing_total("1769895")
      end

      it "returns the hotel without Booking rating" do
        hotel = aggregator.search.first
        expect(hotel[:sources]).to contain_exactly("tripadvisor", "google")
      end
    end

    context "when both Google and Booking fail" do
      before do
        stub_tripadvisor([ ta_hotel ])
        stub_all_lookups_not_found
      end

      it "returns the hotel with only TripAdvisor data" do
        hotel = aggregator.search.first
        expect(hotel[:sources]).to eq([ "tripadvisor" ])
        expect(hotel[:source_ratings].length).to eq(1)
        expect(hotel[:combined_rating]).to eq(4.7)
      end
    end

    context "when TripAdvisor returns no results" do
      before do
        stub_tripadvisor([])
      end

      it "returns an empty array" do
        expect(aggregator.search).to eq([])
      end

      it "does not call Google or Booking" do
        aggregator.search
        expect(WebMock).not_to have_requested(:post, /places.googleapis.com/)
        expect(WebMock).not_to have_requested(:get, /booking-com15/)
      end
    end

    context "when TripAdvisor raises an error" do
      before do
        service = instance_double(TripadvisorService)
        allow(TripadvisorService).to receive(:new).and_return(service)
        allow(service).to receive(:search_hotels).and_raise(StandardError, "TripAdvisor down")
      end

      it "returns an empty array" do
        expect(aggregator.search).to eq([])
      end
    end

    context "sorting" do
      before do
        stub_tripadvisor([ ta_hotel, ta_hotel_2 ])
        stub_google_lookup_success("Le Bristol Paris", rating: 4.7, count: 3174)
        stub_booking_lookup_success("Le Bristol Paris",
                                    dest_id: "1769895", review_score: 9.8, review_nr: 75)
        stub_google_lookup_success("Novotel Paris Les Halles", rating: 4.6, count: 6395)
        stub_booking_lookup_success("Novotel Paris Les Halles",
                                    dest_id: "50200", review_score: 8.0, review_nr: 3200)
      end

      it "sorts by combined rating descending" do
        results = aggregator.search
        ratings = results.map { |h| h[:combined_rating] }
        expect(ratings).to eq(ratings.sort.reverse)
      end
    end

    context "caching" do
      context "when cache has valid results" do
        before do
          CachedSearch.create!(
            location: "paris, france",
            query: "romantic",
            results: [ { "name" => "Cached Hotel", "combined_rating" => 4.0, "sources" => [ "tripadvisor" ] } ],
            expires_at: 30.minutes.from_now
          )
        end

        it "returns cached results without calling any APIs" do
          expect(TripadvisorService).not_to receive(:new)
          results = aggregator.search
          expect(results.first[:name]).to eq("Cached Hotel")
        end
      end

      context "when cache write fails" do
        before do
          stub_tripadvisor([ ta_hotel ])
          stub_all_lookups_not_found
          allow(CachedSearch).to receive(:upsert).and_raise(ActiveRecord::StatementInvalid, "DB error")
        end

        it "still returns results" do
          results = aggregator.search
          expect(results.length).to eq(1)
        end
      end
    end

    context "limits to MAX_HOTELS" do
      before do
        many_hotels = 25.times.map do |i|
          ta_hotel.merge(name: "Hotel #{i}", external_id: i.to_s)
        end
        stub_tripadvisor(many_hotels)
        stub_all_lookups_not_found
      end

      it "returns at most 20 hotels" do
        results = aggregator.search
        expect(results.length).to eq(20)
      end
    end
  end

  # ==========================================
  # Unit tests (private methods via send)
  # ==========================================

  describe "#lookup_google" do
    it "returns rating and coordinates for a found hotel" do
      stub_google_lookup_success("Le Bristol Paris", rating: 4.7, count: 3174)
      result = aggregator.send(:lookup_google, "Le Bristol Paris")
      expect(result[:source]).to eq("google")
      expect(result[:rating]).to eq(4.7)
      expect(result[:count]).to eq(3174)
      expect(result[:latitude]).to eq(48.86)
      expect(result[:longitude]).to eq(2.35)
      expect(result[:address]).to include("Paris")
      expect(result[:image_url]).to include("places.googleapis.com")
    end

    it "returns nil when hotel not found" do
      stub_google_lookup_not_found("Nonexistent Hotel")
      expect(aggregator.send(:lookup_google, "Nonexistent Hotel")).to be_nil
    end

    it "returns nil on API error" do
      stub_google_lookup_error("Error Hotel")
      expect(aggregator.send(:lookup_google, "Error Hotel")).to be_nil
    end

    it "includes location name in the search query" do
      stub_google_lookup_success("Test Hotel", rating: 4.0, count: 100)
      aggregator.send(:lookup_google, "Test Hotel")
      expect(WebMock).to have_requested(:post, "https://places.googleapis.com/v1/places:searchText")
                           .with(body: hash_including("textQuery" => /Paris/))
    end
  end

  describe "#lookup_booking" do
    it "returns normalized rating for a found hotel" do
      stub_booking_lookup_success("Le Bristol Paris",
                                  dest_id: "1769895", review_score: 9.8, review_nr: 75)
      result = aggregator.send(:lookup_booking, "Le Bristol Paris")
      expect(result[:source]).to eq("booking")
      expect(result[:rating]).to eq(4.9)
      expect(result[:count]).to eq(75)
      expect(result[:rating_raw]).to eq(9.8)
    end

    it "returns nil when hotel not found on Booking" do
      stub_booking_lookup_not_found("Unknown Hotel")
      expect(aggregator.send(:lookup_booking, "Unknown Hotel")).to be_nil
    end

    it "returns nil on API error" do
      stub_booking_lookup_error("Error Hotel")
      expect(aggregator.send(:lookup_booking, "Error Hotel")).to be_nil
    end

    it "filters by city name from location" do
      stub_request(:get, /booking-com15\.p\.rapidapi\.com.*searchDestination/)
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: {
            status: true,
            data: [
              { search_type: "hotel", dest_id: "111", city_name: "Lyon", name: "Hotel Lyon", cc1: "fr" },
              { search_type: "hotel", dest_id: "222", city_name: "Paris", name: "Hotel Paris", cc1: "fr" }
            ]
          }.to_json
        )
      stub_request(:get, /booking-com15\.p\.rapidapi\.com.*getHotelReviewScores/)
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: {
            status: true,
            data: [ {
                     score_breakdown: [ {
                                         customer_type: "total",
                                         average_score: "9.0",
                                         count: 100,
                                         question: [ { question: "total", score: 9.0, count: 100 } ]
                                       } ]
                   } ]
          }.to_json
        )

      result = aggregator.send(:lookup_booking, "Some Hotel")
      expect(result[:count]).to eq(100)
    end

    it "returns nil when review scores have no total customer type" do
      stub_request(:get, /booking-com15.*searchDestination/)
        .to_return(
          status: 200,
          headers: { "Content-Type" => "application/json" },
          body: {
            status: true,
            data: [ { search_type: "hotel", dest_id: "999", city_name: "Paris", cc1: "fr" } ]
          }.to_json
        )
      stub_booking_review_scores_missing_total("999")

      expect(aggregator.send(:lookup_booking, "Some Hotel")).to be_nil
    end
  end

  describe "#compute_weighted_average" do
    it "computes weighted average based on review counts" do
      ratings = [
        { source: "google", rating: 4.0, count: 1000 },
        { source: "booking", rating: 5.0, count: 1000 }
      ]
      result = aggregator.send(:compute_weighted_average, ratings)
      expect(result).to eq(4.5)
    end

    it "weights higher review count more heavily" do
      ratings = [
        { source: "google", rating: 4.0, count: 9000 },
        { source: "booking", rating: 5.0, count: 1000 }
      ]
      result = aggregator.send(:compute_weighted_average, ratings)
      expect(result).to eq(4.1)
    end

    it "falls back to simple average when counts are zero" do
      ratings = [
        { source: "google", rating: 4.0, count: 0 },
        { source: "booking", rating: 5.0, count: 0 }
      ]
      result = aggregator.send(:compute_weighted_average, ratings)
      expect(result).to eq(4.5)
    end

    it "returns nil for empty array" do
      expect(aggregator.send(:compute_weighted_average, [])).to be_nil
    end

    it "returns nil when no ratings present" do
      ratings = [ { source: "google", rating: nil, count: 100 } ]
      expect(aggregator.send(:compute_weighted_average, ratings)).to be_nil
    end

    it "handles single source" do
      ratings = [ { source: "google", rating: 4.3, count: 500 } ]
      expect(aggregator.send(:compute_weighted_average, ratings)).to eq(4.3)
    end
  end

  describe "#build_merged_hotel" do
    let(:google_data) do
      { source: "google", rating: 4.7, count: 3174,
        address: "112 Rue de Paris", latitude: 48.86, longitude: 2.35,
        image_url: "https://places.googleapis.com/photo.jpg" }
    end

    let(:booking_data) do
      { source: "booking", rating: 4.9, rating_raw: 9.8, count: 75,
        url: "https://www.booking.com/hotel/fr/le-bristol.html", name: "Le Bristol" }
    end

    it "merges all three sources" do
      result = aggregator.send(:build_merged_hotel, ta_hotel, google_data, booking_data)
      expect(result[:sources]).to contain_exactly("tripadvisor", "google", "booking")
      expect(result[:source_ratings].length).to eq(3)
    end

    it "prefers Google image" do
      result = aggregator.send(:build_merged_hotel, ta_hotel, google_data, booking_data)
      expect(result[:image_url]).to include("places.googleapis.com")
    end

    it "falls back to TripAdvisor image when Google has none" do
      result = aggregator.send(:build_merged_hotel, ta_hotel, nil, booking_data)
      expect(result[:image_url]).to include("tripadvisor.com")
    end

    it "prefers Booking URL" do
      result = aggregator.send(:build_merged_hotel, ta_hotel, google_data, booking_data)
      expect(result[:url]).to include("booking.com")
    end

    it "falls back to TripAdvisor URL when Booking has none" do
      result = aggregator.send(:build_merged_hotel, ta_hotel, google_data, nil)
      expect(result[:url]).to include("tripadvisor.in")
    end

    it "uses Google coordinates" do
      result = aggregator.send(:build_merged_hotel, ta_hotel, google_data, booking_data)
      expect(result[:latitude]).to eq(48.86)
      expect(result[:longitude]).to eq(2.35)
    end

    it "handles nil Google and Booking data" do
      result = aggregator.send(:build_merged_hotel, ta_hotel, nil, nil)
      expect(result[:sources]).to eq([ "tripadvisor" ])
      expect(result[:combined_rating]).to eq(4.7)
      expect(result[:image_url]).to include("tripadvisor.com")
    end

    it "uses TripAdvisor price" do
      result = aggregator.send(:build_merged_hotel, ta_hotel, google_data, booking_data)
      expect(result[:price_per_night]).to eq(1660.0)
    end

    it "preserves hotel name from TripAdvisor" do
      result = aggregator.send(:build_merged_hotel, ta_hotel, google_data, booking_data)
      expect(result[:name]).to eq("Le Bristol Paris")
    end
  end
end
