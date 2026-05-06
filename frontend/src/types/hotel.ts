export interface SourceRating {
  source: "tripadvisor" | "google" | "booking";
  rating: number;
  count: number;
}

export interface Hotel {
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  combined_rating: number | null;
  total_reviews: number;
  source_ratings: SourceRating[];
  sources: string[];
  image_url: string | null;
  price_per_night: number | null;
  url: string | null;
  external_id: string;
  source: string;
}

export interface SearchResponse {
  location: string;
  keywords: string[];
  check_in: string;
  check_out: string;
  count: number;
  hotels: Hotel[];
}

export interface LocationSuggestion {
  place_id: string;
  description: string;
}

export interface PriceFilterState {
  min: number;
  max: number;
  includeNoPrices: boolean;
}

export interface StreamProgress {
  stage: string;
  message: string;
  percent: number;
}
