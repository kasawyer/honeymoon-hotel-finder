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
  end

  describe "#rapidapi_connection" do
    it "sets the correct headers" do
      allow(ENV).to receive(:fetch).with("RAPIDAPI_KEY").and_return("test_key_123")
      conn = client.rapidapi_connection("booking-com.p.rapidapi.com")
      expect(conn.headers["X-RapidAPI-Key"]).to eq("test_key_123")
      expect(conn.headers["X-RapidAPI-Host"]).to eq("booking-com.p.rapidapi.com")
    end
  end
end
