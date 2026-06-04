// src/components/HotelDetail.jsx
import { X, Star, MapPin, Globe } from "lucide-react";
import { useEffect } from "react";
import { GoogleMap, MarkerF, useLoadScript } from "@react-google-maps/api";

const SOURCE_CONFIG = {
  google: { label: "Google", color: "#4285F4" },
  booking: { label: "Booking.com", color: "#003580" },
  tripadvisor: { label: "TripAdvisor", color: "#00AF87" },
};

function RatingBar({ rating, maxRating = 5 }) {
  const percentage = (rating / maxRating) * 100;
  return (
    <div className="flex items-center gap-2 flex-1">
      <div
        className="flex-1 h-2 overflow-hidden"
        style={{ backgroundColor: "var(--color-border-warm)", borderRadius: "100px" }}
      >
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: "var(--color-primary)",
            borderRadius: "100px",
          }}
        />
      </div>
      <span
        className="text-sm font-medium w-8 text-right"
        style={{ color: "var(--color-text-main)" }}
      >
        {Number(rating).toFixed(1)}
      </span>
    </div>
  );
}

function HotelMiniMap({ latitude, longitude, name }) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  });

  if (!isLoaded) {
    return (
      <div>
        <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text-main)" }}>
          Location
        </h3>
        <div
          className="flex items-center justify-center"
          style={{
            height: "200px",
            backgroundColor: "white",
            borderRadius: "12px",
            border: "1px solid var(--color-border-warm)",
          }}
        >
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Loading map...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text-main)" }}>
        Location
      </h3>
      <div
        className="overflow-hidden"
        style={{ borderRadius: "12px", border: "1px solid var(--color-border-warm)" }}
      >
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "200px" }}
          center={{ lat: latitude, lng: longitude }}
          zoom={15}
          options={{
            disableDefaultUI: true,
            zoomControl: true,
            scrollwheel: false,
          }}
        >
          <MarkerF position={{ lat: latitude, lng: longitude }} title={name} />
        </GoogleMap>
      </div>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs block text-center mt-1"
        style={{ color: "var(--color-text-muted)" }}
      >
        Open in Google Maps
      </a>
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

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={onClose} />

      {/* Slide-over panel */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] overflow-y-auto transform transition-transform duration-300"
        style={{ backgroundColor: "var(--color-bg-warm)" }}
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
            <div
              className="h-40"
              style={{ background: "linear-gradient(135deg, #EDE4DA 0%, #F5ECE3 100%)" }}
            />
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Hotel name overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h2
              className={`font-editorial text-xl sm:text-2xl font-medium ${hotel.image_url ? "text-white" : ""}`}
              style={!hotel.image_url ? { color: "var(--color-text-main)" } : {}}
            >
              {hotel.name}
            </h2>
            {hotel.address && (
              <p
                className={`text-sm mt-1 flex items-center gap-1 ${hotel.image_url ? "text-white/80" : ""}`}
                style={!hotel.image_url ? { color: "var(--color-text-muted)" } : {}}
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
              className="flex items-center gap-4 p-4"
              style={{ backgroundColor: "var(--color-primary-light)", borderRadius: "12px" }}
            >
              <div className="text-center">
                <div className="text-3xl font-medium" style={{ color: "var(--color-primary)" }}>
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
                <p className="text-sm font-medium" style={{ color: "var(--color-text-main)" }}>
                  Combined Rating
                </p>
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
              <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text-main)" }}>
                Ratings by Platform
              </h3>
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
                        <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                          {config.label}
                        </span>
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
            <div
              className="flex items-center justify-between p-4"
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                border: "1px solid var(--color-border-warm)",
              }}
            >
              <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Price from
              </span>
              <div className="text-right">
                <span className="text-2xl font-medium" style={{ color: "var(--color-primary)" }}>
                  ${Number(hotel.price_per_night).toFixed(0)}
                </span>
                <span className="text-sm ml-1" style={{ color: "var(--color-text-muted)" }}>
                  / night
                </span>
              </div>
            </div>
          )}

          {/* Source badges */}
          <div>
            <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text-main)" }}>
              Found on
            </h3>
            <div className="flex flex-wrap gap-2">
              {sources.map((src) => {
                const config = SOURCE_CONFIG[src] || { label: src, color: "#666" };
                return (
                  <span
                    key={src}
                    className="px-3 py-1.5 text-xs font-medium text-white"
                    style={{ backgroundColor: config.color, borderRadius: "100px" }}
                  >
                    {config.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Map preview */}
          {/* Mini map */}
          {hotel.latitude && hotel.longitude && (
            <HotelMiniMap latitude={hotel.latitude} longitude={hotel.longitude} name={hotel.name} />
          )}

          {/* Action buttons */}
          <div className="space-y-2 pb-4">
            {hotel.url && (
              <a
                href={hotel.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 text-white font-medium transition-colors hover:opacity-90"
                style={{ backgroundColor: "var(--color-primary)", borderRadius: "9px" }}
              >
                <Globe className="w-4 h-4" />
                {"View on " + (SOURCE_CONFIG[hotel.source]?.label || "Provider")}
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
