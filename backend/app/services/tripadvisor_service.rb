# app/services/tripadvisor_service.rb
#
# Wraps the TripAdvisor API via RapidAPI.
# Two-step process: resolve geoId → search hotels.
#
class TripadvisorService < ApiClient
  HOST = "tripadvisor16.p.rapidapi.com"

  def search_hotels(location:, check_in:, check_out:, keywords: [])
    conn = rapidapi_connection(HOST)

    # Step 1: Resolve location to TripAdvisor's geoId
    geo_id = resolve_geo_id(conn, location)
    return [] unless geo_id

    # Step 2: Search hotels
    response = conn.get("/api/v1/hotels/searchHotels", {
      geoId: geo_id,
      checkIn: check_in,
      checkOut: check_out,
      adults: 2,
      rooms: 1,
      currencyCode: "USD"
    })
    data = handle_response(response, source: "TripAdvisor")

    hotels = data.dig("data", "data") || []
    filter_and_normalize(hotels, keywords)
  rescue ApiError => e
    Rails.logger.error("[TripadvisorService] #{e.message}")
    []
  end

  private

  def resolve_geo_id(conn, location)
    response = conn.get("/api/v1/hotels/searchLocation", { query: location })
    data = handle_response(response, source: "TripAdvisor")
    data.dig("data", 0, "geoId")
  end

  def filter_and_normalize(hotels, keywords)
    filtered = if keywords.present?
                 hotels.select do |h|
                   searchable = clean_title(h["title"]).downcase
                   keywords.any? { |kw| searchable.include?(kw.downcase) }
                 end
               else
                 hotels
               end

    results_to_map = filtered.present? ? filtered : hotels.first(20)
    results_to_map.map { |h| normalize(h) }
  end

  # Title comes as "1. Le Royal Monceau - Raffles Paris" — strip the number prefix
  def clean_title(title)
    return "" unless title
    title.sub(/\A\d+\.\s*/, "")
  end

  def normalize(hotel)
    {
      source: "tripadvisor",
      external_id: hotel["id"].to_s,
      name: clean_title(hotel["title"]),
      address: hotel["secondaryInfo"],
      latitude: nil,
      longitude: nil,
      rating: hotel.dig("bubbleRating", "rating"),
      total_ratings: parse_rating_count(hotel.dig("bubbleRating", "count")),
      image_url: build_image_url(hotel),
      price_per_night: extract_price(hotel),
      url: hotel.dig("commerceInfo", "externalUrl")
    }
  end

  def build_image_url(hotel)
    template = hotel.dig("cardPhotos", 0, "sizes", "urlTemplate")
    return nil unless template
    template.gsub("{width}", "400").gsub("{height}", "300")
  end

  # Price comes as "$1,660" — extract the number
  def extract_price(hotel)
    price_str = hotel["priceForDisplay"] || hotel.dig("commerceInfo", "priceForDisplay", "text")
    return nil unless price_str.is_a?(String)
    price_str.gsub(/[^0-9.]/, "").to_f
  end

  # Count comes as "(1,829)" — extract the number
  def parse_rating_count(count_str)
    return nil unless count_str.is_a?(String)
    count_str.gsub(/[^0-9]/, "").to_i
  end
end
