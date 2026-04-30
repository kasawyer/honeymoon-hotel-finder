// src/pages/HomePage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MapPin, Star, Globe } from "lucide-react";
import SearchBar from "../components/SearchBar";
import KeywordFilter from "../components/KeywordFilter";

const POPULAR = [
  { name: "Maldives", emoji: "🏝️" },
  { name: "Santorini, Greece", emoji: "🇬🇷" },
  { name: "Bali, Indonesia", emoji: "🌺" },
  { name: "Paris, France", emoji: "🗼" },
  { name: "Amalfi Coast, Italy", emoji: "🇮🇹" },
  { name: "Bora Bora", emoji: "🌊" },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [keywords, setKeywords] = useState(["romantic", "honeymoon", "anniversary"]);

  const handleSearch = (location) => {
    const params = new URLSearchParams({
      location,
      keywords: keywords.join(","),
    });
    navigate(`/results?${params.toString()}`);
  };

  return (
    <div className="flex flex-col items-center px-4">
      {/* Hero */}
      <div className="text-center mt-16 sm:mt-24 mb-10 max-w-2xl">
        <Heart
          className="w-16 h-16 mx-auto mb-6 fill-rose-100"
          style={{ color: "var(--color-primary)" }}
        />
        <h1
          className="text-4xl sm:text-5xl font-bold mb-4 leading-tight"
          style={{ color: "var(--color-primary)" }}
        >
          Find Your Dream Honeymoon Hotel
        </h1>
        <p className="text-lg" style={{ color: "var(--color-text-light)" }}>
          Search across Booking.com, TripAdvisor, Expedia & Google to find the most romantic stays
          for your special trip.
        </p>
      </div>

      {/* Search */}
      <SearchBar onSearch={handleSearch} />

      {/* Keywords */}
      <div className="mt-8 w-full max-w-2xl">
        <p className="text-sm text-center mb-3" style={{ color: "var(--color-text-muted)" }}>
          Filter by vibe:
        </p>
        <KeywordFilter selected={keywords} onChange={setKeywords} />
      </div>

      {/* Popular destinations */}
      <div className="mt-16 mb-20 w-full max-w-2xl">
        <h2
          className="text-sm font-semibold text-center mb-4"
          style={{ color: "var(--color-text-muted)" }}
        >
          POPULAR HONEYMOON DESTINATIONS
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {POPULAR.map((dest) => (
            <button
              key={dest.name}
              onClick={() => handleSearch(dest.name)}
              className="px-4 py-2 bg-white rounded-full text-sm text-gray-600
                         border border-gray-100 hover:border-rose-300 hover:text-rose-700
                         hover:shadow-md transition-all duration-200"
            >
              {dest.emoji} {dest.name}
            </button>
          ))}
        </div>
      </div>

      {/* Trust badges */}
      <div className="flex flex-wrap justify-center gap-8 mb-16 opacity-50">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Globe className="w-4 h-4" /> 4 Search Providers
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Star className="w-4 h-4" /> Real Reviews
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <MapPin className="w-4 h-4" /> Map View
        </div>
      </div>
    </div>
  );
}
