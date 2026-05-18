// src/components/NoResults.jsx
import { SearchX, MapPin } from "lucide-react";

const SUGGESTIONS_BY_REGION = {
  europe: {
    keywords: [
      "paris",
      "london",
      "rome",
      "barcelona",
      "santorini",
      "greece",
      "italy",
      "france",
      "spain",
      "portugal",
      "croatia",
      "dubrovnik",
      "amalfi",
    ],
    suggestions: [
      { name: "Paris, France", emoji: "🗼" },
      { name: "Santorini, Greece", emoji: "🇬🇷" },
      { name: "Amalfi Coast, Italy", emoji: "🇮🇹" },
      { name: "Dubrovnik, Croatia", emoji: "🏰" },
    ],
  },
  asia: {
    keywords: [
      "bali",
      "thailand",
      "phuket",
      "indonesia",
      "maldives",
      "japan",
      "vietnam",
      "philippines",
      "singapore",
    ],
    suggestions: [
      { name: "Bali, Indonesia", emoji: "🌺" },
      { name: "Phuket, Thailand", emoji: "🏖️" },
      { name: "Maldives", emoji: "🏝️" },
      { name: "Kyoto, Japan", emoji: "🇯🇵" },
    ],
  },
  caribbean: {
    keywords: [
      "cancun",
      "mexico",
      "tulum",
      "caribbean",
      "jamaica",
      "bahamas",
      "aruba",
      "turks",
      "caicos",
      "puerto rico",
    ],
    suggestions: [
      { name: "Cancun, Mexico", emoji: "🌮" },
      { name: "Tulum, Mexico", emoji: "🏛️" },
      { name: "Jamaica", emoji: "🇯🇲" },
      { name: "Bahamas", emoji: "🏝️" },
    ],
  },
  pacific: {
    keywords: ["fiji", "bora bora", "tahiti", "hawaii", "maui", "australia", "new zealand"],
    suggestions: [
      { name: "Bora Bora", emoji: "🌊" },
      { name: "Fiji", emoji: "🏝️" },
      { name: "Maui, Hawaii", emoji: "🌺" },
      { name: "Queenstown, New Zealand", emoji: "🇳🇿" },
    ],
  },
};

const DEFAULT_SUGGESTIONS = [
  { name: "Paris, France", emoji: "🗼" },
  { name: "Bali, Indonesia", emoji: "🌺" },
  { name: "Maldives", emoji: "🏝️" },
  { name: "Santorini, Greece", emoji: "🇬🇷" },
  { name: "Cancun, Mexico", emoji: "🌮" },
  { name: "Bora Bora", emoji: "🌊" },
];

function getSuggestions(location) {
  const lower = location.toLowerCase();

  for (const region of Object.values(SUGGESTIONS_BY_REGION)) {
    if (region.keywords.some((kw) => lower.includes(kw))) {
      // Return suggestions from the same region, excluding the searched location
      return region.suggestions.filter((s) => !lower.includes(s.name.toLowerCase().split(",")[0]));
    }
  }

  return DEFAULT_SUGGESTIONS.filter((s) => !lower.includes(s.name.toLowerCase().split(",")[0]));
}

export default function NoResults({ location, onSearch }) {
  const suggestions = getSuggestions(location);

  return (
    <div className="text-center py-16 sm:py-20">
      <SearchX className="w-16 h-16 mx-auto mb-4 text-gray-200" />
      <p className="text-xl font-medium text-gray-400">No hotels found</p>
      <p className="text-sm text-gray-300 mt-2 max-w-md mx-auto">
        We couldn't find romantic hotels in{" "}
        <span className="font-medium text-gray-400">{location}</span>. This destination may not be
        in our providers' databases yet.
      </p>

      {suggestions.length > 0 && (
        <div className="mt-8">
          <p className="text-sm font-medium mb-4" style={{ color: "var(--color-text-muted)" }}>
            Try one of these popular honeymoon destinations:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((dest) => (
              <button
                key={dest.name}
                onClick={() => onSearch(dest.name)}
                className="px-4 py-2.5 sm:py-2 bg-white rounded-full text-sm text-gray-600
                           border border-gray-100 hover:border-rose-300 hover:text-rose-700
                           hover:shadow-md transition-all duration-200 flex items-center gap-1.5"
              >
                <MapPin className="w-3 h-3" style={{ color: "var(--color-text-muted)" }} />
                {dest.emoji} {dest.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
