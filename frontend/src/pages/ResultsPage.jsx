// src/pages/ResultsPage.jsx
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Map, LayoutGrid, AlertCircle, RefreshCw } from "lucide-react";
import SearchBar from "../components/SearchBar";
import KeywordFilter from "../components/KeywordFilter";
import HotelList from "../components/HotelList";
import MapView from "../components/MapView";
import { searchHotels } from "../api/client";

export default function ResultsPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const location = searchParams.get("location") || "";
    const keywordsParam = searchParams.get("keywords") || "romantic,honeymoon,anniversary";

    const [hotels, setHotels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [keywords, setKeywords] = useState(keywordsParam.split(","));
    const [viewMode, setViewMode] = useState("grid"); // "grid" or "map"

    // Fetch hotels when URL params change
    const fetchHotels = useCallback(async () => {
        if (!location) return;

        setLoading(true);
        setError(null);

        try {
            const data = await searchHotels({ location, keywords });
            setHotels(data.hotels || []);
        } catch (err) {
            console.error("Search error:", err);
            if (err.response?.status === 429) {
                setError("Too many searches — please wait a minute and try again.");
            } else if (err.code === "ECONNABORTED") {
                setError("Search timed out — the hotel APIs are slow right now. Please try again.");
            } else {
                setError("Something went wrong while searching. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    }, [location, keywords]);

    useEffect(() => {
        fetchHotels();
    }, [fetchHotels]);

    const handleNewSearch = (newLocation) => {
        const params = new URLSearchParams({
            location: newLocation,
            keywords: keywords.join(","),
        });
        navigate(`/results?${params.toString()}`);
    };

    const handleApplyFilters = () => {
        const params = new URLSearchParams({
            location,
            keywords: keywords.join(","),
        });
        navigate(`/results?${params.toString()}`);
    };

    // Count hotels by source for the summary
    const sourceCounts = hotels.reduce((acc, h) => {
        acc[h.source] = (acc[h.source] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            {/* Search + filters header */}
            <div className="flex flex-col items-center gap-4 mb-8">
                <SearchBar onSearch={handleNewSearch} initialValue={location} />
                <KeywordFilter selected={keywords} onChange={setKeywords} />
                <button
                    onClick={handleApplyFilters}
                    className="px-6 py-2 rounded-full text-white text-sm font-medium
                     hover:brightness-110 transition-all"
                    style={{ backgroundColor: "var(--color-primary)" }}
                >
                    Apply Filters
                </button>
            </div>

            {/* Results header bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
                <div>
                    <h2 className="text-xl font-semibold text-gray-700">
                        {loading
                            ? "Searching across all providers..."
                            : `${hotels.length} hotel${hotels.length !== 1 ? "s" : ""} found`}
                    </h2>
                    {!loading && hotels.length > 0 && (
                        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                            {Object.entries(sourceCounts)
                                .map(([src, count]) => `${count} from ${src}`)
                                .join(" · ")}
                        </p>
                    )}
                </div>

                {/* View toggle */}
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode("grid")}
                        className={`p-2 rounded-md transition-colors ${
                            viewMode === "grid" ? "bg-white shadow-sm text-rose-800" : "text-gray-400 hover:text-gray-600"
                        }`}
                        title="Grid view"
                    >
                        <LayoutGrid className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode("map")}
                        className={`p-2 rounded-md transition-colors ${
                            viewMode === "map" ? "bg-white shadow-sm text-rose-800" : "text-gray-400 hover:text-gray-600"
                        }`}
                        title="Map view"
                    >
                        <Map className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Error state */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl mb-6
                        flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p>{error}</p>
                        <button
                            onClick={fetchHotels}
                            className="mt-2 inline-flex items-center gap-1 text-sm font-medium
                         text-red-800 hover:underline"
                        >
                            <RefreshCw className="w-3 h-3" /> Try again
                        </button>
                    </div>
                </div>
            )}

            {/* Results */}
            {viewMode === "grid" ? (
                <HotelList hotels={hotels} loading={loading} />
            ) : (
                <>
                    <MapView hotels={hotels} />
                    {/* Show list below map too */}
                    <div className="mt-8">
                        <HotelList hotels={hotels} loading={loading} />
                    </div>
                </>
            )}
        </div>
    );
}