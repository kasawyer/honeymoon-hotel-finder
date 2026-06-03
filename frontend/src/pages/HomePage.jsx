// src/pages/HomePage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import KeywordFilter from "../components/KeywordFilter";

const POPULAR = [
  { name: "Maldives" },
  { name: "Santorini, Greece" },
  { name: "Bali, Indonesia" },
  { name: "Paris, France" },
  { name: "Amalfi Coast, Italy" },
  { name: "Bora Bora" },
  { name: "Maui, Hawaii" },
  { name: "Tulum, Mexico" },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [keywords, setKeywords] = useState(["romantic", "honeymoon"]);

  const handleSearch = (location) => {
    const params = new URLSearchParams({
      location,
      keywords: keywords.join(","),
    });
    navigate(`/results?${params.toString()}`);
  };

  return (
    <div className="flex flex-col items-center px-4 sm:px-6">
      {/* Hero */}
      <div className="mt-16 sm:mt-24 mb-8 text-center max-w-xxl">
        <h1
          className="font-editorial text-3xl sm:text-4xl mb-3"
          style={{ color: "var(--color-text-main)", lineHeight: 1.2, fontWeight: 500 }}
        >
          Your honeymoon hotel, reviewed by thousands
        </h1>
        <p
          className="text-sm sm:text-base"
          style={{ color: "var(--color-text-light)", lineHeight: 1.6 }}
        >
          We aggregate reviews from Google, Booking.com and TripAdvisor so you don't have to.
        </p>
      </div>

      {/* Search */}
      <div className="w-full max-w-xl mb-6">
        <SearchBar onSearch={handleSearch} />
      </div>

      {/* Keywords */}
      <div className="mb-12">
        <KeywordFilter selected={keywords} onChange={setKeywords} />
      </div>

      {/* Popular destinations */}
      <div className="mb-20 text-center">
        <p
          className="text-xs uppercase tracking-widest mb-4"
          style={{ color: "var(--color-text-muted)", letterSpacing: "2px" }}
        >
          Popular destinations
        </p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {POPULAR.map((dest) => (
            <button
              key={dest.name}
              onClick={() => handleSearch(dest.name)}
              className="text-sm font-medium transition-colors hover:opacity-70"
              style={{
                color: "var(--color-primary)",
                background: "none",
                border: "none",
                borderBottom: "1px solid var(--color-primary)",
                cursor: "pointer",
                padding: "2px 0",
              }}
            >
              {dest.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
