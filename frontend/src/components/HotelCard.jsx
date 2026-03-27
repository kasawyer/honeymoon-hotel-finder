// src/components/HotelCard.jsx
import { Star, MapPin, ExternalLink } from "lucide-react";

const SOURCE_CONFIG = {
    google:      { label: "Google",      color: "#4285F4" },
    booking:     { label: "Booking.com", color: "#003580" },
    tripadvisor: { label: "TripAdvisor", color: "#00AF87" },
    expedia:     { label: "Expedia",     color: "#FBAF17" },
};

export default function HotelCard({ hotel }) {
    const handleCardClick = () => {
        if (hotel.url) {
            window.open(hotel.url, "_blank", "noopener,noreferrer");
        }
    };

    const sources = hotel.sources || [hotel.source];
    const sourceRatings = hotel.source_ratings || [];

    return (
        <div
            onClick={handleCardClick}
            className={`bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl
                  transition-all duration-300 border border-gray-50 group
                  ${hotel.url ? "cursor-pointer" : ""}`}
        >
            {/* Image */}
            <div className="relative h-48 bg-gradient-to-br from-rose-50 to-amber-50 overflow-hidden">
                {hotel.image_url ? (
                    <img
                        src={hotel.image_url}
                        alt={hotel.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => { e.target.style.display = "none"; }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="w-12 h-12 text-rose-200" />
                    </div>
                )}

                {/* Source badges — show all sources that found this hotel */}
                <div className="absolute top-3 right-3 flex gap-1">
                    {sources.map((src) => {
                        const config = SOURCE_CONFIG[src] || { label: src, color: "#666" };
                        return (
                            <span
                                key={src}
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm"
                                style={{ backgroundColor: config.color }}
                            >
                {config.label}
              </span>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                <h3 className="font-bold text-lg text-gray-800 mb-1 line-clamp-1 group-hover:text-rose-800 transition-colors">
                    {hotel.name}
                </h3>

                {hotel.address && (
                    <p className="text-sm mb-3 flex items-center gap-1" style={{ color: "var(--color-text-light)" }}>
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="line-clamp-1">{hotel.address}</span>
                    </p>
                )}

                {/* Combined rating */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                        {hotel.combined_rating ? (
                            <>
                                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                                <span className="font-bold text-lg text-gray-800">
                  {Number(hotel.combined_rating).toFixed(1)}
                </span>
                                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {hotel.total_reviews
                      ? `(${Number(hotel.total_reviews).toLocaleString()} reviews)`
                      : ""}
                                    {sources.length > 1 ? ` · ${sources.length} sources` : ""}
                </span>
                            </>
                        ) : (
                            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>No rating</span>
                        )}
                    </div>

                    {/* Price */}
                    {hotel.price_per_night ? (
                        <div className="text-right">
              <span className="text-xl font-bold" style={{ color: "var(--color-primary)" }}>
                ${Number(hotel.price_per_night).toFixed(0)}
              </span>
                            <span className="text-xs block" style={{ color: "var(--color-text-muted)" }}>
                per night
              </span>
                        </div>
                    ) : null}
                </div>

                {/* Per-source rating breakdown */}
                {sourceRatings.length > 1 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {sourceRatings.map((sr) => {
                            const config = SOURCE_CONFIG[sr.source] || { label: sr.source, color: "#666" };
                            return (
                                <div
                                    key={sr.source}
                                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-50"
                                >
                  <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: config.color }}
                  />
                                    <span className="text-gray-500">{config.label}</span>
                                    <span className="font-semibold text-gray-700">{Number(sr.rating).toFixed(1)}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* External link */}
                {hotel.url && (
                    <p
                        className="inline-flex items-center gap-1 text-sm font-medium
                       hover:underline transition-colors"
                        style={{ color: "var(--color-primary)" }}
                    >
                        View details <ExternalLink className="w-3 h-3" />
                    </p>
                )}
            </div>
        </div>
    );
}