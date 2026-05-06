import { useState, useCallback, useRef } from "react";
import type { Hotel, StreamProgress } from "../types/hotel";

const API_URL = import.meta.env.VITE_API_URL || "";

interface StreamingSearchResult {
  hotels: Hotel[];
  loading: boolean;
  error: string | null;
  progress: StreamProgress | null;
  search: (params: { location: string; keywords: string[] }) => void;
  cancel: () => void;
}

interface CompleteEventData {
  hotels: Hotel[];
  count: number;
  cached: boolean;
}

interface ErrorEventData {
  error: string;
}

export default function useStreamingSearch(): StreamingSearchResult {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<StreamProgress | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const search = useCallback(({ location, keywords }: { location: string; keywords: string[] }) => {
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

    eventSource.addEventListener("progress", (event: MessageEvent) => {
      const data: StreamProgress = JSON.parse(event.data);
      setProgress(data);
    });

    eventSource.addEventListener("complete", (event: MessageEvent) => {
      const data: CompleteEventData = JSON.parse(event.data);
      setHotels(data.hotels || []);
      setLoading(false);
      setProgress({ stage: "done", message: "Search complete!", percent: 100 });
      eventSource.close();
    });

    eventSource.addEventListener("error", (event: MessageEvent) => {
      try {
        const data: ErrorEventData = JSON.parse(event.data);
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
