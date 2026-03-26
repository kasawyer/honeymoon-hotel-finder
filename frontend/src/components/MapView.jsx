// src/components/MapView.jsx
import { GoogleMap, MarkerF, InfoWindowF, useLoadScript } from "@react-google-maps/api";
import { useState, useMemo } from "react";
import { Star, ExternalLink, Loader2 } from "lucide-react";

const LIBRARIES = ["places"];

const MAP_OPTIONS = {
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    styles: [
        { featureType: "poi.business", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
    ],
};

export default function MapView({ hotels }) {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: LIBRARIES,
    });

    const [selected, setSelected] = useState(null);

    // Calculate map center from hotel coordinates
    const center = useMemo(() => {
        const withCoords = hotels.filter((h) => h.latitude && h.longitude);
        if (withCoords.length === 0) return { lat: 20, lng: 0 }; // World center

        const avgLat = withCoords.reduce((s, h) => s + h.latitude, 0) / withCoords.length;
        const avgLng = withCoords.reduce((s, h) => s + h.longitude, 0) / withCoords.length;
        return { lat: avgLat, lng: avgLng };
    }, [hotels]);

    if (loadError) {
        return (
            <div className="h-96 bg-gray-50 rounded-2xl flex items-center justify-center">
                <p className="text-gray-400">Failed to load Google Maps</p>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="h-[500px] bg-gray-50 rounded-2xl flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
            </div>
        );
    }

    const mappable = hotels.filter((h) => h.latitude && h.longitude);

    return (
        <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-100">
            <GoogleMap
                zoom={mappable.length > 0 ? 12 : 3}
                center={center}
                mapContainerStyle={{ width: "100%", height: "500px" }}
                options={MAP_OPTIONS}
            >
                {mappable.map((hotel, i) => (
                    <MarkerF
                        key={`${hotel.source}-${hotel.external_id}-${i}`}
                        position={{ lat: hotel.latitude, lng: hotel.longitude }}
                        onClick={() => setSelected(hotel)}
                        title={hotel.name}
                    />
                ))}

                {selected && (
                    <InfoWindowF
                        position={{ lat: selected.latitude, lng: selected.longitude }}
                        onCloseClick={() => setSelected(null)}
                    >
                        <div className="max-w-[220px] p-1">
                            <h3 className="font-bold text-sm mb-1">{selected.name}</h3>
                            {selected.rating && (
                                <div className="flex items-center gap-1 mb-1">
                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                    <span className="text-xs font-medium">{Number(selected.rating).toFixed(1)}</span>
                                </div>
                            )}
                            {selected.price_per_night && (
                                <p className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
                                    ${Number(selected.price_per_night).toFixed(0)}/night
                                </p>
                            )}
                            {selected.url && (
                                <a
                                    href={selected.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1"
                                >
                                    View details <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                            )}
                        </div>
                    </InfoWindowF>
                )}
            </GoogleMap>

            {mappable.length === 0 && (
                <div className="bg-amber-50 text-amber-700 text-sm px-4 py-2 text-center">
                    No hotels have map coordinates — try a different search
                </div>
            )}
        </div>
    );
}