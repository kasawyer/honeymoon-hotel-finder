import { useState, useCallback, useRef } from "react";
import type { Hotel, StreamProgress } from "../types/hotel";

const API_URL = import.meta.env.VITE_API_URL || "";

interface StreamingSearchResult {
  hotels: Hotel[];
  loading: boolean;
  expanding: boolean;
  error: string | null;
  progress: StreamProgress | null;
  providerErrors: string[];
  degradedProviders: string[];
  search: (params: {
    location: string;
    keywords: string[];
    checkIn?: string;
    checkOut?: string;
  }) => void;
  cancel: () => void;
}

interface CompleteEventData {
  hotels: Hotel[];
  count: number;
  cached: boolean;
  provider_errors?: string[];
  degraded_providers?: string[];
  has_more?: boolean;
}

interface MoreResultsEventData {
  hotels: Hotel[];
  count: number;
  total_count: number;
}

interface ExpansionCompleteData {
  additional_count: number;
  total_count: number;
}

interface ErrorEventData {
  error: string;
}

export default function useStreamingSearch(): StreamingSearchResult {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<StreamProgress | null>(null);
  const [providerErrors, setProviderErrors] = useState<string[]>([]);
  const [degradedProviders, setDegradedProviders] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  const search = useCallback(
    ({
      location,
      keywords,
      checkIn,
      checkOut,
    }: {
      location: string;
      keywords: string[];
      checkIn?: string;
      checkOut?: string;
    }) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setLoading(true);
      setExpanding(false);
      setError(null);
      setHotels([]);
      setProviderErrors([]);
      setDegradedProviders([]);
      setProgress({ stage: "connecting", message: "Starting search...", percent: 0 });

      const params = new URLSearchParams({
        location,
        keywords: keywords.join(","),
      });
      if (checkIn) params.set("check_in", checkIn);
      if (checkOut) params.set("check_out", checkOut);

      const url = `${API_URL}/api/v1/searches/stream?${params.toString()}`;
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener("progress", (event: MessageEvent) => {
        const data: StreamProgress = JSON.parse(event.data);
        setProgress(data);
      });

      eventSource.addEventListener("complete", (event: MessageEvent) => {
        const data: CompleteEventData = JSON.parse(event.data);
        setHotels(data.hotels || []);
        setProviderErrors(data.provider_errors || []);
        setDegradedProviders(data.degraded_providers || []);
        setLoading(false);
        setProgress({ stage: "done", message: "Search complete!", percent: 100 });

        // If there are more results coming, show expanding state
        if (data.has_more) {
          setExpanding(true);
        } else {
          eventSource.close();
        }
      });

      eventSource.addEventListener("more_results", (event: MessageEvent) => {
        const data: MoreResultsEventData = JSON.parse(event.data);
        setHotels((prev) => {
          // Deduplicate by name
          const existingNames = new Set(prev.map((h) => h.name.toLowerCase()));
          const newHotels = data.hotels.filter((h) => !existingNames.has(h.name.toLowerCase()));
          const combined = [...prev, ...newHotels];
          // Re-sort by combined rating
          return combined.sort((a, b) => (b.combined_rating || 0) - (a.combined_rating || 0));
        });
      });

      eventSource.addEventListener("expansion_complete", (event: MessageEvent) => {
        setExpanding(false);
        eventSource.close();
      });

      eventSource.addEventListener("expand_progress", (event: MessageEvent) => {
        // Optional: could show a secondary progress indicator
      });

      eventSource.addEventListener("error", (event: MessageEvent) => {
        try {
          const data: ErrorEventData = JSON.parse(event.data);
          setError(data.error || "Something went wrong.");
        } catch {
          setError("Connection lost. Please try again.");
        }
        setLoading(false);
        setExpanding(false);
        eventSource.close();
      });

      eventSource.onerror = () => {
        if (eventSource.readyState === EventSource.CLOSED) return;
        setError("Connection lost. Please try again.");
        setLoading(false);
        setExpanding(false);
        eventSource.close();
      };
    },
    []
  );

  const cancel = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      setLoading(false);
      setExpanding(false);
      setProgress(null);
    }
  }, []);

  return {
    hotels,
    loading,
    expanding,
    error,
    progress,
    providerErrors,
    degradedProviders,
    search,
    cancel,
  };
}
