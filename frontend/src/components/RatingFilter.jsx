// src/components/RatingFilter.jsx
import { Star } from "lucide-react";

const RATING_OPTIONS = [
    { label: "Any rating", value: 0 },
    { label: "3.0+", value: 3.0 },
    { label: "3.5+", value: 3.5 },
    { label: "4.0+", value: 4.0 },
    { label: "4.5+", value: 4.5 },
    { label: "5.0", value: 5.0 },
];

export default function RatingFilter({ value, onChange, hotels }) {
    // Count how many hotels match each threshold
    const counts = RATING_OPTIONS.reduce((acc, opt) => {
        acc[opt.value] = hotels.filter(
            (h) => h.combined_rating != null && h.combined_rating >= opt.value
        ).length;
        return acc;
    }, {});

    const hotelsWithoutRating = hotels.filter((h) => h.combined_rating == null).length;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-semibold text-gray-700">Minimum rating</span>
            </div>

            <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map((opt) => {
                    const isActive = value === opt.value;
                    const count = counts[opt.value];
                    const isDisabled = count === 0 && opt.value > 0;

                    return (
                        <button
                            key={opt.value}
                            onClick={() => onChange(isActive && opt.value > 0 ? 0 : opt.value)}
                            disabled={isDisabled}
                            className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                ${isDisabled
                                ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                                : isActive
                                    ? "text-white shadow-md"
                                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                            }
              `}
                            style={isActive && !isDisabled ? { backgroundColor: "var(--color-primary)" } : {}}
                        >
                            {opt.value === 0 ? (
                                "All"
                            ) : (
                                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                                    {opt.label}
                </span>
                            )}
                            <span className={`ml-1 text-xs ${isActive ? "text-rose-200" : "text-gray-400"}`}>
                ({count})
              </span>
                        </button>
                    );
                })}
            </div>

            {hotelsWithoutRating > 0 && value > 0 && (
                <p className="text-xs mt-3" style={{ color: "var(--color-text-muted)" }}>
                    {hotelsWithoutRating} hotel{hotelsWithoutRating !== 1 ? "s" : ""} without ratings hidden
                </p>
            )}
        </div>
    );
}