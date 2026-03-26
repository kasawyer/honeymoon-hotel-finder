// src/components/HotelCard.jsx
import { Star, MapPin, ExternalLink } from "lucide-react";

const SOURCE_CONFIG = {
    google:      { label: "Google",      color: "#4285F4" },
    booking:     { label: "Booking.com", color: "#003580" },
    tripadvisor: { label: "TripAdvisor", color: "#00AF87" },
    expedia:     { label: "Expedia",     color: "#FBAF17" },
};

export default function HotelCard({ hotel }) {
    const source = SOURCE_CONFIG[hotel.source] || { label: hotel.source, color: "#666" };

    return (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl
                    transition-all duration-300 border border-gray-50 group">
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

                {/* Source badge */}
                <span
                    className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm"
                    style={{ backgroundColor: source.color }}
                >
          {source.label}
        </span>
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

                <div className="flex items-center justify-between">
                    {/* Rating */}
                    <div className="flex items-center gap-1">
                        {hotel.rating ? (
                            <>
                                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                <span className="font-semibold text-gray-700">
                  {Number(hotel.rating).toFixed(1)}
                </span>
                                {hotel.total_ratings && (
                                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    ({Number(hotel.total_ratings).toLocaleString()})
                  </span>
                                )}
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

                {/* External link */}
                {hotel.url && (
                    <a
                        href={hotel.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-1 text-sm font-medium
                       hover:underline transition-colors"
                        style={{ color: "var(--color-primary)" }}
                    >
                        View on {source.label} <ExternalLink className="w-3 h-3" />
                    </a>
                )}
            </div>
        </div>
    );
}