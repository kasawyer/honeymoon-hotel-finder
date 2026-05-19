// src/components/HotelDetail.jsx
import { X, Star, MapPin, Globe } from "lucide-react";
import { useEffect } from "react";

const SOURCE_CONFIG = {
  google: { label: "Google", color: "#4285F4" },
  booking: { label: "Booking.com", color: "#003580" },
  tripadvisor: { label: "TripAdvisor", color: "#00AF87" },
};

function RatingBar({ rating, maxRating = 5 }) {
  const percentage = (rating / maxRating) * 100;
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: "var(--color-primary)" }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-8 text-right">
        {Number(rating).toFixed(1)}
      </span>
    </div>
  );
}

export default function HotelDetail({ hotel, onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!hotel) return null;

  const sourceRatings = hotel.source_ratings || [];
  const sources = hotel.sources || [];
  const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${hotel.latitude},${hotel.longitude}`;
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${hotel.latitude},${hotel.longitude}&zoom=15&size=480x200&scale=2&markers=color:red%7C${hotel.latitude},${hotel.longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={onClose} />

      {/* Slide-over panel */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white shadow-2xl
                      overflow-y-auto transform transition-transform duration-300"
      >
        {/* Header with image */}
        <div className="relative">
          {hotel.image_url ? (
            <div className="h-56 sm:h-64">
              <img
                src={hotel.image_url}
                alt={hotel.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          ) : (
            <div className="h-40 bg-gradient-to-br from-rose-50 to-amber-50" />
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/30 text-white
                       hover:bg-black/50 transition-colors backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Hotel name overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h2
              className={`text-xl sm:text-2xl font-bold ${hotel.image_url ? "text-white" : "text-gray-800"}`}
            >
              {hotel.name}
            </h2>
            {hotel.address && (
              <p
                className={`text-sm mt-1 flex items-center gap-1 ${hotel.image_url ? "text-white/80" : "text-gray-500"}`}
              >
                <MapPin className="w-3 h-3 shrink-0" />
                {hotel.address}
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          {/* Combined rating hero */}
          {hotel.combined_rating && (
            <div
              className="flex items-center gap-4 p-4 rounded-xl"
              style={{ backgroundColor: "rgba(139, 34, 82, 0.05)" }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: "var(--color-primary)" }}>
                  {Number(hotel.combined_rating).toFixed(1)}
                </div>
                <div className="flex items-center gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(hotel.combined_rating)
                          ? "text-amber-400 fill-amber-400"
                          : "text-gray-200"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Combined Rating</p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Based on {Number(hotel.total_reviews || 0).toLocaleString()} reviews across{" "}
                  {sources.length} platform{sources.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}

          {/* Per-source ratings */}
          {sourceRatings.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Ratings by Platform</h3>
              <div className="space-y-3">
                {sourceRatings.map((sr) => {
                  const config = SOURCE_CONFIG[sr.source] || { label: sr.source, color: "#666" };
                  return (
                    <div key={sr.source} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-28 shrink-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: config.color }}
                        />
                        <span className="text-sm text-gray-600">{config.label}</span>
                      </div>
                      <RatingBar rating={sr.rating} />
                      <span
                        className="text-xs shrink-0"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        ({Number(sr.count).toLocaleString()})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Price */}
          {hotel.price_per_night && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-600">Price from</span>
              <div className="text-right">
                <span className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>
                  ${Number(hotel.price_per_night).toFixed(0)}
                </span>
                <span className="text-sm text-gray-400 ml-1">/ night</span>
              </div>
            </div>
          )}

          {/* Source badges */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Found on</h3>
            <div className="flex flex-wrap gap-2">
              {sources.map((src) => {
                const config = SOURCE_CONFIG[src] || { label: src, color: "#666" };
                return (
                  <span
                    key={src}
                    className="px-3 py-1.5 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: config.color }}
                  >
                    {config.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Map preview */}
          {hotel.latitude && hotel.longitude && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Location</h3>
              <a
                href={mapsSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow"
              >
                <img
                  src={staticMapUrl}
                  alt={`Map showing ${hotel.name}`}
                  className="w-full h-[150px] sm:h-[200px] object-cover"
                />
              </a>
              <p className="text-xs text-center mt-1" style={{ color: "var(--color-text-muted)" }}>
                Click to open in Google Maps
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2 pb-4">
            {hotel.url && (
              <a
                href={hotel.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                text-white font-medium transition-colors hover:brightness-110"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                <Globe className="w-4 h-4" />
                {"View on " + (SOURCE_CONFIG[hotel.source]?.label || "Provider")}
              </a>
            )}
            {hotel.latitude && hotel.longitude && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.name)}&query_place_id=${hotel.external_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                text-gray-700 font-medium border border-gray-200
                hover:bg-gray-50 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                Open in Google Maps
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
