// src/components/SearchBar.jsx
import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import { searchLocations } from "../api/client";

export default function SearchBar({ onSearch, initialValue = "" }) {
    const [query, setQuery] = useState(initialValue);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const debounceRef = useRef(null);
    const wrapperRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Debounced autocomplete — 300ms after user stops typing
    useEffect(() => {
        if (query.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const results = await searchLocations(query);
                setSuggestions(results);
                setShowSuggestions(results.length > 0);
                setHighlightIndex(-1);
            } catch (err) {
                console.error("Autocomplete error:", err);
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(debounceRef.current);
    }, [query]);

    const selectSuggestion = (description) => {
        setQuery(description);
        setShowSuggestions(false);
        setSuggestions([]);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (query.trim()) {
            setShowSuggestions(false);
            onSearch(query.trim());
        }
    };

    // Keyboard navigation for suggestions
    const handleKeyDown = (e) => {
        if (!showSuggestions || suggestions.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === "Enter" && highlightIndex >= 0) {
            e.preventDefault();
            selectSuggestion(suggestions[highlightIndex].description);
        } else if (e.key === "Escape") {
            setShowSuggestions(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} ref={wrapperRef} className="relative w-full max-w-2xl">
            <div className="flex items-center bg-white rounded-full shadow-lg border border-rose-100
                      focus-within:ring-2 focus-within:ring-rose-300 transition-shadow">
                <MapPin className="w-5 h-5 ml-5 shrink-0" style={{ color: "var(--color-text-muted)" }} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Where's the honeymoon? (e.g., Bali, Maldives, Santorini...)"
                    className="flex-1 px-4 py-4 text-lg outline-none bg-transparent placeholder-gray-300"
                    autoComplete="off"
                />
                {loading && (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" style={{ color: "var(--color-text-muted)" }} />
                )}
                <button
                    type="submit"
                    className="px-6 py-4 text-white font-semibold rounded-r-full transition-colors
                     hover:brightness-110 active:brightness-90"
                    style={{ backgroundColor: "var(--color-primary)" }}
                >
                    <Search className="w-5 h-5" />
                </button>
            </div>

            {/* Autocomplete dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-xl border
                       border-gray-100 overflow-hidden max-h-64 overflow-y-auto">
                    {suggestions.map((s, i) => (
                        <li
                            key={s.place_id}
                            onClick={() => selectSuggestion(s.description)}
                            onMouseEnter={() => setHighlightIndex(i)}
                            className={`px-5 py-3 cursor-pointer flex items-center gap-3
                         border-b border-gray-50 last:border-0 transition-colors
                         ${i === highlightIndex ? "bg-rose-50" : "hover:bg-gray-50"}`}
                        >
                            <MapPin className="w-4 h-4 shrink-0" style={{ color: "var(--color-text-muted)" }} />
                            <span className="text-gray-700 text-sm">{s.description}</span>
                        </li>
                    ))}
                </ul>
            )}
        </form>
    );
}