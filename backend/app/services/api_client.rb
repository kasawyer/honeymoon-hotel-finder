# app/services/api_client.rb
#
# Base class for all external API service objects.
# Provides pre-configured Faraday connections for Google and RapidAPI,
# plus standardized error handling.
#
class ApiClient
  class ApiError < StandardError
    attr_reader :status, :body

    def initialize(message, status: nil, body: nil)
      @status = status
      @body = body
      super(message)
    end
  end

  private

  # Faraday connection for any RapidAPI-hosted service
  # (Booking.com, TripAdvisor, Hotels.com/Expedia)
  def rapidapi_connection(host)
    Faraday.new(url: "https://#{host}") do |f|
      f.request :json
      f.response :json, content_type: /\bjson$/
      f.request :retry, max: 2, interval: 0.5, interval_randomness: 0.5,
                exceptions: [ Faraday::TimeoutError, Faraday::ConnectionFailed ]
      f.options.timeout = 15       # 15 second read timeout
      f.options.open_timeout = 5   # 5 second connection timeout
      f.headers["X-RapidAPI-Key"] = ENV.fetch("RAPIDAPI_KEY")
      f.headers["X-RapidAPI-Host"] = host
    end
  end

  # Faraday connection for Google Maps/Places APIs
  def google_connection
    Faraday.new(url: "https://maps.googleapis.com") do |f|
      f.request :json
      f.response :json, content_type: /\bjson$/
      f.request :retry, max: 2, interval: 0.5
      f.options.timeout = 10
      f.options.open_timeout = 5
    end
  end

  # Raise a descriptive error if the HTTP response is not 2xx
  def handle_response(response, source:)
    return response.body if response.success?

    Rails.logger.error("[#{source}] API error #{response.status}: #{response.body}")
    raise ApiError.new(
      "#{source} API returned #{response.status}",
      status: response.status,
      body: response.body
    )
  end
end
