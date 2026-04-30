// src/pages/ResultsPage.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Map, LayoutGrid, AlertCircle, RefreshCw, SlidersHorizontal } from "lucide-react";
import SearchBar from "../components/SearchBar";
import KeywordFilter from "../components/KeywordFilter";
import HotelList from "../components/HotelList";
import MapView from "../components/MapView";
import Pagination from "../components/Pagination";
import PriceFilter from "../components/PriceFilter";
import RatingFilter from "../components/RatingFilter";
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
  const [viewMode, setViewMode] = useState("grid");
  const [priceFilter, setPriceFilter] = useState({ min: 0, max: Infinity, includeNoPrices: true });
  const [minRating, setMinRating] = useState(0);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const HOTELS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);

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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [priceFilter, minRating, hotels]);

  // Filter hotels by price and rating
  const filteredHotels = useMemo(() => {
    return hotels.filter((hotel) => {
      // Price filter
      if (hotel.price_per_night == null) {
        if (!priceFilter.includeNoPrices) return false;
      } else if (
        hotel.price_per_night < priceFilter.min ||
        hotel.price_per_night > priceFilter.max
      ) {
        return false;
      }

      // Rating filter
      if (minRating > 0) {
        if (hotel.combined_rating == null) return false;
        if (hotel.combined_rating < minRating) return false;
      }

      return true;
    });
  }, [hotels, priceFilter, minRating]);

  // Paginate filtered hotels
  const totalPages = Math.ceil(filteredHotels.length / HOTELS_PER_PAGE);
  const paginatedHotels = useMemo(() => {
    const start = (currentPage - 1) * HOTELS_PER_PAGE;
    return filteredHotels.slice(start, start + HOTELS_PER_PAGE);
  }, [filteredHotels, currentPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNewSearch = (newLocation) => {
    const params = new URLSearchParams({
      location: newLocation,
      keywords: keywords.join(","),
    });
    navigate(`/results?${params.toString()}`);
  };

  const handleKeywordChange = (newKeywords) => {
    setKeywords(newKeywords);
  };

  const handleApplyKeywords = () => {
    const params = new URLSearchParams({
      location,
      keywords: keywords.join(","),
    });
    navigate(`/results?${params.toString()}`);
  };

  const handlePriceFilterChange = useCallback((filter) => {
    setPriceFilter(filter);
  }, []);

  // Count hotels by source for the summary
  const sourceCounts = filteredHotels.reduce((acc, h) => {
    (h.sources || [h.source]).forEach((s) => {
      acc[s] = (acc[s] || 0) + 1;
    });
    return acc;
  }, {});

  // Sidebar content — shared between desktop and mobile
  const filterSidebar = (
    <div className="space-y-4">
      <PriceFilter hotels={hotels} onFilterChange={handlePriceFilterChange} />
      <RatingFilter value={minRating} onChange={setMinRating} hotels={hotels} />

      {/* Keywords */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Keywords</p>
        <KeywordFilter selected={keywords} onChange={handleKeywordChange} />
        <button
          onClick={handleApplyKeywords}
          className="mt-4 w-full py-2 rounded-full text-white text-sm font-medium
                     hover:brightness-110 transition-all"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          Update Search
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Search header */}
      <div className="flex flex-col items-center gap-4 mb-8">
        <SearchBar onSearch={handleNewSearch} initialValue={location} />
      </div>

      {/* Mobile filter toggle */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-white rounded-xl
                     border border-gray-200 text-sm font-medium text-gray-700"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {showMobileFilters ? "Hide Filters" : "Show Filters"}
        </button>
        {showMobileFilters && <div className="mt-4">{filterSidebar}</div>}
      </div>

      {/* Main content area with sidebar */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Desktop sidebar filters */}
        {!loading && hotels.length > 0 && (
          <div className="hidden lg:block lg:w-72 shrink-0">
            <div
              className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto
                            pr-2 -mr-2 scrollbar-thin"
            >
              {filterSidebar}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="flex-1">
          {/* Results header bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-700">
                {loading
                  ? "Searching across all providers..."
                  : `${filteredHotels.length} hotel${filteredHotels.length !== 1 ? "s" : ""} found`}
              </h2>
              {!loading && filteredHotels.length > 0 && (
                <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                  {filteredHotels.length !== hotels.length && (
                    <span>
                      {hotels.length} total, {filteredHotels.length} matching filters ·{" "}
                    </span>
                  )}
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
                  viewMode === "grid"
                    ? "bg-white shadow-sm text-rose-800"
                    : "text-gray-400 hover:text-gray-600"
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "map"
                    ? "bg-white shadow-sm text-rose-800"
                    : "text-gray-400 hover:text-gray-600"
                }`}
                title="Map view"
              >
                <Map className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div
              className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl mb-6
                            flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>Something went wrong while searching. Please try again.</p>
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
            <>
              <HotelList hotels={paginatedHotels} loading={loading} />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </>
          ) : (
            <>
              <MapView hotels={paginatedHotels} />
              <div className="mt-8">
                <HotelList hotels={paginatedHotels} loading={loading} />
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
