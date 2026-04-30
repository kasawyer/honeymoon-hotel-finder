// src/components/PriceFilter.jsx
import { useState, useEffect } from "react";
import { DollarSign } from "lucide-react";

export default function PriceFilter({ hotels, onFilterChange }) {
  // Calculate min/max from hotels that have prices
  const hotelsWithPrices = hotels.filter((h) => h.price_per_night != null);
  const priceMin =
    hotelsWithPrices.length > 0
      ? Math.floor(Math.min(...hotelsWithPrices.map((h) => h.price_per_night)))
      : 0;
  const priceMax =
    hotelsWithPrices.length > 0
      ? Math.ceil(Math.max(...hotelsWithPrices.map((h) => h.price_per_night)))
      : 1000;

  const [range, setRange] = useState([priceMin, priceMax]);
  const [includeNoPrices, setIncludeNoPrices] = useState(true);
  const [prevPriceMin, setPrevPriceMin] = useState(priceMin);
  const [prevPriceMax, setPrevPriceMax] = useState(priceMax);

  // Reset range when hotels change (new search) — no useEffect needed
  if (priceMin !== prevPriceMin || priceMax !== prevPriceMax) {
    setRange([priceMin, priceMax]);
    setPrevPriceMin(priceMin);
    setPrevPriceMax(priceMax);
  }

  // Notify parent of filter changes
  useEffect(() => {
    onFilterChange({ min: range[0], max: range[1], includeNoPrices });
  }, [range, includeNoPrices, onFilterChange]);

  const handleMinChange = (e) => {
    const val = Math.min(Number(e.target.value), range[1] - 1);
    setRange([val, range[1]]);
  };

  const handleMaxChange = (e) => {
    const val = Math.max(Number(e.target.value), range[0] + 1);
    setRange([range[0], val]);
  };

  if (hotelsWithPrices.length === 0) return null;

  const hotelsWithoutPrices = hotels.length - hotelsWithPrices.length;

  // Calculate the position percentages for the filled track
  const minPercent = ((range[0] - priceMin) / (priceMax - priceMin)) * 100;
  const maxPercent = ((range[1] - priceMin) / (priceMax - priceMin)) * 100;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
          <span className="text-sm font-semibold text-gray-700">Price per night</span>
        </div>
        <div className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>
          ${range[0]} — ${range[1]}
        </div>
      </div>

      {/* Dual range slider */}
      <div className="relative h-6 mb-2">
        {/* Track background */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 bg-gray-200 rounded-full" />

        {/* Active track */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
            backgroundColor: "var(--color-primary)",
          }}
        />

        {/* Min slider */}
        <input
          type="range"
          min={priceMin}
          max={priceMax}
          value={range[0]}
          onChange={handleMinChange}
          className="absolute w-full top-0 h-6 appearance-none bg-transparent pointer-events-none
                     [&::-webkit-slider-thumb]:pointer-events-auto
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-5
                     [&::-webkit-slider-thumb]:h-5
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-white
                     [&::-webkit-slider-thumb]:border-2
                     [&::-webkit-slider-thumb]:border-rose-800
                     [&::-webkit-slider-thumb]:shadow-md
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-webkit-slider-thumb]:relative
                     [&::-webkit-slider-thumb]:z-10
                     [&::-moz-range-thumb]:pointer-events-auto
                     [&::-moz-range-thumb]:appearance-none
                     [&::-moz-range-thumb]:w-5
                     [&::-moz-range-thumb]:h-5
                     [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-white
                     [&::-moz-range-thumb]:border-2
                     [&::-moz-range-thumb]:border-rose-800
                     [&::-moz-range-thumb]:shadow-md
                     [&::-moz-range-thumb]:cursor-pointer"
        />

        {/* Max slider */}
        <input
          type="range"
          min={priceMin}
          max={priceMax}
          value={range[1]}
          onChange={handleMaxChange}
          className="absolute w-full top-0 h-6 appearance-none bg-transparent pointer-events-none
                     [&::-webkit-slider-thumb]:pointer-events-auto
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-5
                     [&::-webkit-slider-thumb]:h-5
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-white
                     [&::-webkit-slider-thumb]:border-2
                     [&::-webkit-slider-thumb]:border-rose-800
                     [&::-webkit-slider-thumb]:shadow-md
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-webkit-slider-thumb]:relative
                     [&::-webkit-slider-thumb]:z-20
                     [&::-moz-range-thumb]:pointer-events-auto
                     [&::-moz-range-thumb]:appearance-none
                     [&::-moz-range-thumb]:w-5
                     [&::-moz-range-thumb]:h-5
                     [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-white
                     [&::-moz-range-thumb]:border-2
                     [&::-moz-range-thumb]:border-rose-800
                     [&::-moz-range-thumb]:shadow-md
                     [&::-moz-range-thumb]:cursor-pointer"
        />
      </div>

      {/* Min/max labels */}
      <div className="flex justify-between text-xs" style={{ color: "var(--color-text-muted)" }}>
        <span>${priceMin}</span>
        <span>${priceMax}</span>
      </div>

      {/* Include hotels without prices */}
      {hotelsWithoutPrices > 0 && (
        <label className="flex items-center gap-2 mt-4 cursor-pointer">
          <input
            type="checkbox"
            checked={includeNoPrices}
            onChange={(e) => setIncludeNoPrices(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 accent-rose-800"
          />
          <span className="text-sm text-gray-600">
            Include {hotelsWithoutPrices} hotel{hotelsWithoutPrices !== 1 ? "s" : ""} without prices
          </span>
        </label>
      )}
    </div>
  );
}
