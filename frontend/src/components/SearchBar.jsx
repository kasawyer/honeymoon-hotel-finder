// src/components/SearchBar.jsx
import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import { searchLocations } from "../api/client";

export default function SearchBar({ onSearch, initialValue = "" }) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);
  const isUserTypingRef = useRef(false);
  const inputRef = useRef(null);

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
    if (!isUserTypingRef.current) return;
    if (query.length < 2) return;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchLocations(query);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setHighlightIndex(-1);
      } catch (err) {
        console.error("Autocomplete error:", err);
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const selectSuggestion = (description) => {
    isUserTypingRef.current = false;
    setQuery(description);
    setShowSuggestions(false);
    setSuggestions([]);
    onSearch(description);
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
      <div
        className="flex items-center bg-white border transition-colors"
        style={{
          borderRadius: "12px",
          borderColor: "var(--color-border-warm)",
        }}
      >
        <MapPin className="w-5 h-5 ml-4 shrink-0" style={{ color: "var(--color-text-faint)" }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            isUserTypingRef.current = true;
            const val = e.target.value;
            setQuery(val);
            if (val.length < 2) {
              setSuggestions([]);
              setShowSuggestions(false);
            }
          }}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search a destination..."
          className="flex-1 px-3 py-3.5 text-base outline-none bg-transparent"
          style={{ color: "var(--color-text-main)" }}
          autoComplete="off"
        />
        <button
          type="submit"
          className="px-5 py-2.5 text-white text-sm font-medium mr-1.5 transition-colors hover:opacity-90"
          style={{
            backgroundColor: "var(--color-primary)",
            borderRadius: "9px",
          }}
        >
          Search
        </button>
      </div>

      {/* Autocomplete dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <ul
          className="absolute z-50 w-full mt-2 bg-white overflow-hidden max-h-64 overflow-y-auto"
          style={{
            borderRadius: "12px",
            border: "1px solid var(--color-border-warm)",
          }}
        >
          {suggestions.map((s, i) => (
            <li
              key={s.place_id}
              onClick={() => selectSuggestion(s.description)}
              onMouseEnter={() => setHighlightIndex(i)}
              className="px-5 py-4 sm:py-3 cursor-pointer flex items-center gap-3 transition-colors"
              style={{
                borderBottom: "0.5px solid var(--color-border-warm)",
                backgroundColor: i === highlightIndex ? "var(--color-primary-light)" : "white",
              }}
            >
              <MapPin className="w-4 h-4 shrink-0" style={{ color: "var(--color-text-faint)" }} />
              <span className="text-sm" style={{ color: "var(--color-text-main)" }}>
                {s.description}
              </span>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
