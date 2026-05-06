import axios from "axios";
import type { SearchResponse, LocationSuggestion } from "../types/hotel";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  headers: { "Content-Type": "application/json" },
  timeout: 120000,
});

interface SearchParams {
  location: string;
  keywords: string[];
  checkIn?: string;
  checkOut?: string;
}

export async function searchHotels({
  location,
  keywords,
  checkIn,
  checkOut,
}: SearchParams): Promise<SearchResponse> {
  const response = await client.post<SearchResponse>("/api/v1/searches", {
    location,
    keywords,
    check_in: checkIn,
    check_out: checkOut,
  });
  return response.data;
}

export async function searchLocations(query: string): Promise<LocationSuggestion[]> {
  if (!query || query.length < 2) return [];
  const response = await client.get<{ locations: LocationSuggestion[] }>("/api/v1/locations", {
    params: { query },
  });
  return response.data.locations;
}

export default client;
