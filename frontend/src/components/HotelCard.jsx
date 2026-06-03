// src/components/HotelCard.jsx
import { Star, MapPin } from "lucide-react";

const SOURCE_CONFIG = {
  google: { label: "Google", color: "#4285F4" },
  booking: { label: "Booking.com", color: "#003580" },
  tripadvisor: { label: "TripAdvisor", color: "#00AF87" },
  expedia: { label: "Expedia", color: "#FBAF17" },
};

export default function HotelCard({ hotel, onSelect }) {
  const sources = hotel.sources || [hotel.source];
  const sourceRatings = hotel.source_ratings || [];

  return (
    <div
      onClick={() => onSelect && onSelect(hotel)}
      className="overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer"
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        border: "1px solid var(--color-border-warm)",
      }}
    >
      {/* Image */}
      <div
        className="relative h-48 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #EDE4DA 0%, #F5ECE3 100%)" }}
      >
        {hotel.image_url ? (
          <img
            src={hotel.image_url}
            alt={hotel.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-12 h-12" style={{ color: "#D4C4B4" }} />
          </div>
        )}

        {/* Source count badge */}
        {sources.length > 1 && (
          <div
            className="absolute top-3 right-3 text-xs font-medium text-white px-2.5 py-1"
            style={{ borderRadius: "6px", backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            {sources.length} sources
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Name and rating */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3
            className="font-editorial font-medium text-base line-clamp-1 group-hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-text-main)" }}
          >
            {hotel.name}
          </h3>
          {hotel.combined_rating && (
            <div
              className="flex items-center gap-1 shrink-0 px-2 py-0.5"
              style={{ borderRadius: "6px", backgroundColor: "#FDF8F0" }}
            >
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-sm font-medium" style={{ color: "var(--color-text-main)" }}>
                {Number(hotel.combined_rating).toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Address */}
        {hotel.address && (
          <p
            className="text-xs mb-3 flex items-center gap-1 line-clamp-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            <MapPin className="w-3 h-3 shrink-0" />
            {hotel.address}
          </p>
        )}

        {/* Per-source rating pills */}
        {sourceRatings.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {sourceRatings.map((sr) => {
              const config = SOURCE_CONFIG[sr.source] || { label: sr.source, color: "#666" };
              return (
                <div
                  key={sr.source}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1"
                  style={{ borderRadius: "100px", backgroundColor: "var(--color-bg-warm)" }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: config.color }}
                  />
                  <span style={{ color: "var(--color-text-muted)" }}>{config.label}</span>
                  <span className="font-medium" style={{ color: "var(--color-text-main)" }}>
                    {Number(sr.rating).toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer: reviews + price */}
        <div
          className="flex items-center justify-between pt-3"
          style={{ borderTop: "0.5px solid var(--color-border-warm)" }}
        >
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {hotel.total_reviews ? `${Number(hotel.total_reviews).toLocaleString()} reviews` : ""}
          </span>
          {hotel.price_per_night ? (
            <div>
              <span className="text-lg font-medium" style={{ color: "var(--color-primary)" }}>
                ${Number(hotel.price_per_night).toFixed(0)}
              </span>
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                /night
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
