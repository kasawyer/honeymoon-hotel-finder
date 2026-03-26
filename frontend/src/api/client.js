// src/api/client.js
import axios from "axios";

// In development, Vite proxy handles /api/* → Rails
// In production, same origin (Rails serves React static files)
const client = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "",
    headers: { "Content-Type": "application/json" },
    timeout: 30000, // 30s — API aggregation can be slow
});

/**
 * Search for hotels across all providers.
 * @param {Object} params
 * @param {string} params.location — City or destination name
 * @param {string[]} params.keywords — Filter keywords
 * @param {string} [params.checkIn] — YYYY-MM-DD
 * @param {string} [params.checkOut] — YYYY-MM-DD
 * @returns {Promise<{location, keywords, count, hotels}>}
 */
export async function searchHotels({ location, keywords, checkIn, checkOut }) {
    const response = await client.post("/api/v1/searches", {
        location,
        keywords,
        check_in: checkIn,
        check_out: checkOut,
    });
    return response.data;
}

/**
 * Get city autocomplete suggestions.
 * @param {string} query — Partial city name (min 2 chars)
 * @returns {Promise<Array<{place_id, description}>>}
 */
export async function searchLocations(query) {
    if (!query || query.length < 2) return [];
    const response = await client.get("/api/v1/locations", {
        params: { query },
    });
    return response.data.locations;
}

export default client;