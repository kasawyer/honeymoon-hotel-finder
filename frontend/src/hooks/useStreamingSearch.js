// src/hooks/useStreamingSearch.js
import { useState, useCallback, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function useStreamingSearch() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  const eventSourceRef = useRef(null);

  const search = useCallback(({ location, keywords }) => {
    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setLoading(true);
    setError(null);
    setHotels([]);
    setProgress({ stage: "connecting", message: "Starting search...", percent: 0 });

    const params = new URLSearchParams({
      location,
      keywords: keywords.join(","),
    });

    const url = `${API_URL}/api/v1/searches/stream?${params.toString()}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("progress", (event) => {
      const data = JSON.parse(event.data);
      setProgress(data);
    });

    eventSource.addEventListener("complete", (event) => {
      const data = JSON.parse(event.data);
      setHotels(data.hotels || []);
      setLoading(false);
      setProgress({ stage: "done", message: "Search complete!", percent: 100 });
      eventSource.close();
    });

    eventSource.addEventListener("error", (event) => {
      try {
        const data = JSON.parse(event.data);
        setError(data.error || "Something went wrong.");
      } catch {
        setError("Connection lost. Please try again.");
      }
      setLoading(false);
      eventSource.close();
    });

    eventSource.onerror = () => {
      if (eventSource.readyState === EventSource.CLOSED) return;
      setError("Connection lost. Please try again.");
      setLoading(false);
      eventSource.close();
    };
  }, []);

  const cancel = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      setLoading(false);
      setProgress(null);
    }
  }, []);

  return { hotels, loading, error, progress, search, cancel };
}
