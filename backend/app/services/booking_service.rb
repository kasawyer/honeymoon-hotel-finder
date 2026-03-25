# app/services/booking_service.rb
#
# Wraps the Booking.com API via RapidAPI.
# Two-step process: resolve location → search hotels.
# Booking uses a 0-10 rating scale; we normalize to 0-5.
#
class BookingService < ApiClient
  HOST = "booking-com.p.rapidapi.com"

  def search_hotels(location:, check_in:, check_out:, keywords: [])
    conn = rapidapi_connection(HOST)

    # Step 1: Resolve location to Booking.com's dest_id
    dest = resolve_destination(conn, location)
    return [] unless dest

    # Step 2: Search hotels
    response = conn.get("/v1/hotels/search", {
      dest_id: dest[:id],
      dest_type: dest[:type],
      checkin_date: check_in,
      checkout_date: check_out,
      adults_number: 2,
      room_number: 1,
      order_by: "review_score",
      locale: "en-us",
      currency: "USD",
      filter_by_currency: "USD",
      units: "imperial",
      page_number: 0,
      include_adjacency: true
    })
    data = handle_response(response, source: "Booking.com")

    hotels = data["result"] || []
    filter_and_normalize(hotels, keywords)
  rescue ApiError => e
    Rails.logger.error("[BookingService] #{e.message}")
    [] # Gracefully return empty on failure — don't break the aggregator
  end

  private

  def resolve_destination(conn, location)
    response = conn.get("/v1/hotels/locations", {
      name: location,
      locale: "en-us"
    })
    data = handle_response(response, source: "Booking.com")
    return nil if data.blank?

    first = data.first
    { id: first["dest_id"], type: first["dest_type"] }
  end

  def filter_and_normalize(hotels, keywords)
    filtered = if keywords.present?
                 hotels.select do |h|
                   searchable = "#{h['hotel_name']} #{h['hotel_name_trans']} #{h['unit_configuration_label']}".downcase
                   keywords.any? { |kw| searchable.include?(kw.downcase) }
                 end
               else
                 hotels
               end

    # If keyword filtering returns nothing, return all results
    # (the search itself is already hotel-focused)
    results_to_map = filtered.present? ? filtered : hotels.first(20)

    results_to_map.map { |h| normalize(h) }
  end

  def normalize(hotel)
    {
      source: "booking",
      external_id: hotel["hotel_id"].to_s,
      name: hotel["hotel_name"],
      address: [hotel["address"], hotel["city"], hotel["country_trans"]].compact.join(", "),
      latitude: hotel["latitude"]&.to_f,
      longitude: hotel["longitude"]&.to_f,
      rating: hotel["review_score"]&.to_f&./(2.0),  # Convert 0-10 → 0-5
      total_ratings: hotel["review_nr"],
      image_url: hotel["main_photo_url"]&.gsub("square60", "square300"),
      price_per_night: hotel.dig("composite_price_breakdown", "gross_amount_per_night", "value"),
      url: hotel["url"]
    }
  end
end