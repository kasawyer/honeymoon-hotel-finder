# Honeymoon Hotel Finder — API Documentation

Base URL: `http://localhost:3001` (development) or your Heroku URL (production)

---

## Endpoints

### Search Hotels (Standard)

Searches for romantic hotels across TripAdvisor, Google, and Booking.com. Returns aggregated results with combined ratings.

**POST** `/api/v1/searches`

#### Request

```json
{
  "location": "Paris, France",
  "keywords": ["romantic", "honeymoon", "anniversary"],
  "check_in": "2026-06-01",
  "check_out": "2026-06-04"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `location` | string | Yes | City or destination name |
| `keywords` | string[] or string | No | Filter keywords. Array or comma-separated. Defaults to `["romantic", "honeymoon", "anniversary"]` |
| `check_in` | string | No | YYYY-MM-DD. Defaults to tomorrow |
| `check_out` | string | No | YYYY-MM-DD. Defaults to tomorrow + 3 |

#### Response `200 OK`

```json
{
  "location": "Paris, France",
  "keywords": ["romantic", "honeymoon", "anniversary"],
  "check_in": "2026-06-01",
  "check_out": "2026-06-04",
  "count": 20,
  "hotels": [
    {
      "name": "Hôtel Malte - Astotel",
      "address": "63 Rue de Richelieu, 75002 Paris, France",
      "latitude": 48.8672,
      "longitude": 2.3376,
      "combined_rating": 4.8,
      "total_reviews": 6431,
      "source_ratings": [
        { "source": "tripadvisor", "rating": 4.9, "count": 3775 },
        { "source": "google", "rating": 4.8, "count": 1536 },
        { "source": "booking", "rating": 4.7, "count": 1120 }
      ],
      "sources": ["tripadvisor", "google", "booking"],
      "image_url": "https://places.googleapis.com/v1/places/.../media?maxWidthPx=400&key=...",
      "price_per_night": 250.0,
      "url": "https://www.booking.com/hotel/fr/malte-astotel.html",
      "external_id": "ChIJ...",
      "source": "tripadvisor"
    }
  ]
}
```

#### Error Response `422 Unprocessable Entity`

```json
{
  "error": "param is missing or the value is empty: location"
}
```

---

### Search Hotels (Streaming)

Same as above but streams results via Server-Sent Events (SSE) for real-time progress updates.

**GET** `/api/v1/searches/stream`

#### Query Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `location` | string | Yes | City or destination name |
| `keywords` | string | No | Comma-separated keywords |
| `check_in` | string | No | YYYY-MM-DD |
| `check_out` | string | No | YYYY-MM-DD |

#### Example

**GET** `/api/v1/searches/stream?location=Paris&keywords=romantic,honeymoon`

#### SSE Events

**`progress`** — Sent multiple times during the search.

```json
{
  "stage": "enriching",
  "message": "Checking Google & Booking.com (6/20)...",
  "percent": 45
}
```

| Stage | Description |
|-------|-------------|
| `connecting` | Search starting |
| `tripadvisor` | Querying TripAdvisor |
| `tripadvisor_done` | TripAdvisor results received |
| `tripadvisor_fallback` | TripAdvisor unavailable, falling back to Google |
| `google_geocode` | Geocoding location (fallback path) |
| `google_search` | Searching Google Places (fallback path) |
| `enriching` | Looking up hotels on Google and Booking.com |
| `enriching_done` | All hotels enriched |
| `cache_hit` | Results served from cache |
| `done` | Search complete |

**`complete`** — Sent once when the search finishes.

```json
{
  "hotels": [...],
  "count": 20,
  "cached": false,
  "provider_errors": []
}
```

| Field | Type | Description |
|-------|------|-------------|
| `hotels` | array | Same hotel format as POST endpoint |
| `count` | integer | Number of hotels returned |
| `cached` | boolean | Whether results came from Redis cache |
| `provider_errors` | string[] | Providers that were unavailable (e.g., `["TripAdvisor"]`) |

**`error`** — Sent if the search fails entirely.

```json
{
  "error": "An unexpected error occurred."
}
```

---

### Location Autocomplete

Returns city name suggestions for the search bar typeahead.

**GET** `/api/v1/locations`

#### Query Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | Yes | Partial city name (min 2 characters) |

#### Example

**GET** `/api/v1/locations?query=San`

#### Response `200 OK`

```json
{
  "locations": [
    { "place_id": "ChIJIQBpAG2ahYAR_6128GcTUEo", "description": "San Francisco, CA, USA" },
    { "place_id": "ChIJL6ulgOiPQIYRSFOBkEKN_04", "description": "San Antonio, TX, USA" },
    { "place_id": "ChIJSx6SrQ9T2YARed8V_f0hOg0", "description": "San Diego, CA, USA" }
  ]
}
```

---

### Health Check

**GET** `/up`

Returns `200 OK` with body `OK`. Used by Heroku and uptime monitors.

---

## Data Model

### Hotel Object

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Hotel name (from TripAdvisor or Google) |
| `address` | string | Full address (from Google if available) |
| `latitude` | float | Latitude coordinate (from Google) |
| `longitude` | float | Longitude coordinate (from Google) |
| `combined_rating` | float | Weighted average rating across all sources (0-5 scale) |
| `total_reviews` | integer | Sum of review counts across all sources |
| `source_ratings` | array | Individual rating from each provider |
| `sources` | string[] | Which providers found this hotel |
| `image_url` | string | Hotel photo URL (Google preferred, TripAdvisor fallback) |
| `price_per_night` | float | Lowest price from any provider (USD) |
| `url` | string | Booking URL (Booking.com preferred, TripAdvisor fallback) |
| `external_id` | string | Google Place ID or TripAdvisor ID |
| `source` | string | Primary source provider |

### Source Rating Object

| Field | Type | Description |
|-------|------|-------------|
| `source` | string | Provider name: `"tripadvisor"`, `"google"`, or `"booking"` |
| `rating` | float | Rating on 0-5 scale (Booking.com converted from 0-10) |
| `count` | integer | Number of reviews on this platform |

---

## Architecture

Client (React)
│
├── POST /api/v1/searches ──────────> Standard JSON response
│
└── GET /api/v1/searches/stream ───> SSE streaming response
│
▼
Rails API (SearchesController)
│
▼
HotelAggregator / StreamingHotelAggregator
│
├── Check Redis cache ──────> HIT: return cached results
│
├── TripAdvisor (primary) ──> Search by city + keywords
│   └── (fallback) ─────────> Google Places Nearby Search
│
├── For each hotel:
│   ├── Google Text Search ─> Rating + coordinates + photo
│   └── Booking.com ────────> Rating + price + booking URL
│       ├── searchDestination (find hotel)
│       └── getHotelReviewScores (get rating)
│
├── Merge + sort + deduplicate
│
└── Cache in Redis (2h search, 24h per-hotel)

## Rate Limiting

API requests are rate limited per IP:

| Endpoint | Limit |
|----------|-------|
| `POST /api/v1/searches` | 30 requests/minute |
| `GET /api/v1/locations` | 60 requests/minute |

Exceeded limits return `429 Too Many Requests`.

## Caching

| Cache Layer | TTL | Description |
|-------------|-----|-------------|
| Search results | 2 hours | Full search results by location + keywords |
| Google hotel lookup | 24 hours | Individual hotel rating from Google |
| Booking hotel lookup | 24 hours | Individual hotel rating from Booking.com |

Cache is warmed daily at 4 AM UTC for 15 popular honeymoon destinations via Sidekiq.

## External APIs

| Provider | API | Authentication |
|----------|-----|----------------|
| Google Places (New) | `places.googleapis.com/v1/` | `X-Goog-Api-Key` header |
| TripAdvisor | `tripadvisor16.p.rapidapi.com` | `X-RapidAPI-Key` header |
| Booking.com | `booking-com15.p.rapidapi.com` | `X-RapidAPI-Key` header |
