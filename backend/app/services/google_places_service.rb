# app/services/google_places_service.rb
#
# Wraps the Google Places API (New) — the current version.
# All endpoints are POST to places.googleapis.com/v1/
# Authentication via X-Goog-Api-Key header.
# Field masks control what data is returned (and what you're billed for).
#
class GooglePlacesService < ApiClient
  BASE_URL = "https://places.googleapis.com"

  # Convert a city/location name to coordinates using Text Search.
  # Returns: { latitude:, longitude:, formatted_address:, place_id: } or nil
  def geocode(location_name)
    response = places_connection.post("/v1/places:searchText") do |req|
      req.headers["X-Goog-FieldMask"] = "places.id,places.location,places.formattedAddress,places.displayName"
      req.body = { textQuery: location_name, maxResultCount: 1 }.to_json
    end
    data = handle_response(response, source: "Google Places")

    place = data.dig("places", 0)
    return nil unless place

    {
      latitude: place.dig("location", "latitude"),
      longitude: place.dig("location", "longitude"),
      formatted_address: place["formattedAddress"],
      place_id: place["id"]
    }
  end

  # Search for hotels near a lat/lng, filtered by romantic keywords.
  # Uses Nearby Search (New) with includedTypes: ["lodging"]
  # Returns: Array of normalized hotel hashes
  def search_hotels(latitude:, longitude:, keywords: [])
    response = places_connection.post("/v1/places:searchNearby") do |req|
      req.headers["X-Goog-FieldMask"] = [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "places.priceLevel",
        "places.photos"
      ].join(",")
      req.body = {
        includedTypes: ["lodging"],
        maxResultCount: 20,
        rankPreference: "POPULARITY",
        locationRestriction: {
          circle: {
            center: { latitude: latitude, longitude: longitude },
            radius: 25000.0
          }
        }
      }.to_json
    end
    data = handle_response(response, source: "Google Places")

    places = data["places"] || []

    # If keywords provided, filter results by name
    if keywords.present?
      filtered = places.select do |p|
        name = p.dig("displayName", "text").to_s.downcase
        keywords.any? { |kw| name.include?(kw.downcase) }
      end
      # Fall back to all results if keyword filter returns nothing
      places = filtered.presence || places
    end

    places.map { |p| normalize(p) }
  end

  # Autocomplete city names for the search bar.
  # Uses Autocomplete (New) — POST request
  # Returns: Array of { place_id:, description: }
  def autocomplete(query)
    response = places_connection.post("/v1/places:autocomplete") do |req|
      req.body = {
        input: query,
        includedPrimaryTypes: ["(cities)"]
      }.to_json
    end
    data = handle_response(response, source: "Google Places")

    suggestions = data["suggestions"] || []
    suggestions.filter_map do |s|
      prediction = s["placePrediction"]
      next unless prediction

      {
        place_id: prediction.dig("placeId") || prediction.dig("place"),
        description: prediction.dig("text", "text") || prediction.dig("structuredFormat", "mainText", "text")
      }
    end
  end

  private

  # Connection for Places API (New) — different from legacy
  def places_connection
    Faraday.new(url: BASE_URL) do |f|
      f.request :json
      f.response :json, content_type: /\bjson$/
      f.request :retry, max: 2, interval: 0.5
      f.options.timeout = 10
      f.options.open_timeout = 5
      f.headers["X-Goog-Api-Key"] = api_key
      f.headers["Content-Type"] = "application/json"
    end
  end

  def api_key
    ENV.fetch("GOOGLE_MAPS_API_KEY")
  end

  def normalize(place)
    {
      source: "google",
      external_id: place["id"],
      name: place.dig("displayName", "text"),
      address: place["formattedAddress"],
      latitude: place.dig("location", "latitude"),
      longitude: place.dig("location", "longitude"),
      rating: place["rating"],
      total_ratings: place["userRatingCount"],
      image_url: photo_url(place.dig("photos", 0, "name")),
      price_per_night: nil,
      price_level: place["priceLevel"],
      url: nil
    }
  end

  def photo_url(photo_name)
    return nil unless photo_name
    "#{BASE_URL}/v1/#{photo_name}/media?maxWidthPx=400&key=#{api_key}"
  end
end
