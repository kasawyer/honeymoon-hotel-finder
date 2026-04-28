require "rails_helper"

RSpec.describe ApiClient do
  # Create a testable subclass since ApiClient methods are private
  let(:client_class) do
    Class.new(ApiClient) do
      public :rapidapi_connection, :google_connection, :handle_response
    end
  end
  let(:client) { client_class.new }

  describe "#handle_response" do
    it "returns the body for successful responses" do
      response = double("response", success?: true, body: { "data" => "ok" })
      result = client.handle_response(response, source: "Test")
      expect(result).to eq({ "data" => "ok" })
    end

    it "raises ApiError for failed responses" do
      response = double("response", success?: false, status: 429, body: "Rate limited")
      expect {
        client.handle_response(response, source: "Test")
      }.to raise_error(ApiClient::ApiError, /Test API returned 429/)
    end

    it "includes the status code in the error" do
      response = double("response", success?: false, status: 503, body: "Service Unavailable")
      begin
        client.handle_response(response, source: "Google")
      rescue ApiClient::ApiError => e
        expect(e.status).to eq(503)
        expect(e.body).to eq("Service Unavailable")
      end
    end

    it "includes the source name in the error message" do
      response = double("response", success?: false, status: 500, body: "error")
      expect {
        client.handle_response(response, source: "Booking.com")
      }.to raise_error(ApiClient::ApiError, /Booking\.com/)
    end
  end

  describe "#rapidapi_connection" do
    before do
      allow(ENV).to receive(:fetch).with("RAPIDAPI_KEY").and_return("test_key_123")
    end

    it "sets the RapidAPI key header" do
      conn = client.rapidapi_connection("booking-com15.p.rapidapi.com")
      expect(conn.headers["X-RapidAPI-Key"]).to eq("test_key_123")
    end

    it "sets the RapidAPI host header" do
      conn = client.rapidapi_connection("booking-com15.p.rapidapi.com")
      expect(conn.headers["X-RapidAPI-Host"]).to eq("booking-com15.p.rapidapi.com")
    end

    it "configures the base URL from the host" do
      conn = client.rapidapi_connection("tripadvisor16.p.rapidapi.com")
      expect(conn.url_prefix.to_s).to eq("https://tripadvisor16.p.rapidapi.com/")
    end

    it "sets timeout options" do
      conn = client.rapidapi_connection("booking-com15.p.rapidapi.com")
      expect(conn.options.timeout).to eq(15)
      expect(conn.options.open_timeout).to eq(5)
    end
  end

  describe "#google_connection" do
    it "sets the base URL to Google Maps" do
      conn = client.google_connection
      expect(conn.url_prefix.to_s).to eq("https://maps.googleapis.com/")
    end

    it "sets timeout options" do
      conn = client.google_connection
      expect(conn.options.timeout).to eq(10)
      expect(conn.options.open_timeout).to eq(5)
    end
  end

  describe "ApiError" do
    it "stores status and body" do
      error = ApiClient::ApiError.new("test error", status: 422, body: { "detail" => "invalid" })
      expect(error.message).to eq("test error")
      expect(error.status).to eq(422)
      expect(error.body).to eq({ "detail" => "invalid" })
    end

    it "defaults status and body to nil" do
      error = ApiClient::ApiError.new("simple error")
      expect(error.status).to be_nil
      expect(error.body).to be_nil
    end
  end
end
