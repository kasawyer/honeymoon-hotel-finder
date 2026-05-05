// src/pages/__tests__/ResultsPage.test.jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithRouter } from "../../test/test-utils";
import ResultsPage from "../ResultsPage";

// Mock the API client (still needed for SearchBar autocomplete)
vi.mock("../../api/client", () => ({
  searchLocations: vi.fn().mockResolvedValue([]),
}));

// Mock Google Maps
vi.mock("@react-google-maps/api", () => ({
  GoogleMap: ({ children }) => <div data-testid="google-map">{children}</div>,
  MarkerF: () => <div data-testid="map-marker" />,
  InfoWindowF: ({ children }) => <div>{children}</div>,
  useLoadScript: () => ({ isLoaded: true, loadError: null }),
}));

// Mock useSearchParams
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams("location=Paris&keywords=romantic,honeymoon")],
    useNavigate: () => vi.fn(),
  };
});

const mockHotels = [
  {
    name: "Le Bristol Paris",
    address: "112 Rue du Faubourg Saint-Honoré",
    combined_rating: 4.7,
    total_reviews: 5078,
    source_ratings: [
      { source: "tripadvisor", rating: 4.7, count: 1829 },
      { source: "google", rating: 4.7, count: 3174 },
      { source: "booking", rating: 4.9, count: 75 },
    ],
    sources: ["tripadvisor", "google", "booking"],
    image_url: "https://example.com/photo.jpg",
    price_per_night: 1660,
    url: "https://booking.com/le-bristol",
    external_id: "197528",
    source: "tripadvisor",
    latitude: 48.87,
    longitude: 2.31,
  },
];

// Helper to create a mock EventSource
function createMockEventSource() {
  const listeners = {};
  const instance = {
    addEventListener: vi.fn((event, callback) => {
      listeners[event] = callback;
    }),
    close: vi.fn(),
    readyState: 0,
    onerror: null,
    _emit(event, data) {
      if (listeners[event]) {
        listeners[event]({ data: JSON.stringify(data) });
      }
    },
    _emitError() {
      instance.readyState = 2;
      if (instance.onerror) {
        instance.onerror();
      }
    },
  };
  return instance;
}

let mockEventSource;

let lastEventSourceUrl;

beforeEach(() => {
  vi.clearAllMocks();
  mockEventSource = createMockEventSource();
  lastEventSourceUrl = null;
  globalThis.EventSource = function (url) {
    lastEventSourceUrl = url;
    // Copy methods but use a proxy for onerror so it sticks
    this.addEventListener = mockEventSource.addEventListener;
    this.close = mockEventSource.close;
    this.readyState = mockEventSource.readyState;
    this._emit = mockEventSource._emit;
    this._emitError = () => {
      this.readyState = 2;
      if (this.onerror) this.onerror();
    };
    // Update mockEventSource reference so tests can call _emit/_emitError
    mockEventSource._emitError = this._emitError.bind(this);
    mockEventSource.close = this.close;
    return this;
  };
});

describe("ResultsPage", () => {
  it("shows progress bar while searching", async () => {
    renderWithRouter(<ResultsPage />);

    // Simulate progress event
    mockEventSource._emit("progress", {
      stage: "tripadvisor",
      message: "Searching TripAdvisor...",
      percent: 10,
    });

    await waitFor(() => {
      expect(screen.getByText("Searching TripAdvisor...")).toBeInTheDocument();
    });
  });

  it("displays hotel results after streaming completes", async () => {
    renderWithRouter(<ResultsPage />);

    mockEventSource._emit("complete", { hotels: mockHotels, count: 1, cached: false });

    await waitFor(() => {
      expect(screen.getByText("Le Bristol Paris")).toBeInTheDocument();
    });
  });

  it("shows result count after loading", async () => {
    renderWithRouter(<ResultsPage />);

    mockEventSource._emit("complete", { hotels: mockHotels, count: 1, cached: false });

    await waitFor(() => {
      expect(screen.getByText(/1 hotel found/)).toBeInTheDocument();
    });
  });

  it("shows error message on SSE error event", async () => {
    renderWithRouter(<ResultsPage />);

    mockEventSource._emit("error", { error: "Something went wrong." });

    await waitFor(() => {
      expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
    });
  });

  it("shows error on connection failure", async () => {
    const { act } = await import("@testing-library/react");

    renderWithRouter(<ResultsPage />);

    act(() => {
      mockEventSource._emitError();
    });

    await waitFor(() => {
      expect(screen.getByText("Connection lost. Please try again.")).toBeInTheDocument();
    });
  });

  it("shows retry button on error", async () => {
    renderWithRouter(<ResultsPage />);

    mockEventSource._emit("error", { error: "fail" });

    await waitFor(() => {
      const retryButton = screen.getByRole("button", { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  it("renders the search bar with location prefilled", () => {
    renderWithRouter(<ResultsPage />);
    expect(screen.getByDisplayValue("Paris")).toBeInTheDocument();
  });

  it("renders grid/map view toggle buttons after results load", async () => {
    renderWithRouter(<ResultsPage />);

    mockEventSource._emit("complete", { hotels: mockHotels, count: 1, cached: false });

    await waitFor(() => {
      expect(screen.getByTitle("Grid view")).toBeInTheDocument();
      expect(screen.getByTitle("Map view")).toBeInTheDocument();
    });
  });

  it("shows empty state when no hotels found", async () => {
    renderWithRouter(<ResultsPage />);

    mockEventSource._emit("complete", { hotels: [], count: 0, cached: false });

    await waitFor(() => {
      expect(screen.getByText("No hotels found")).toBeInTheDocument();
    });
  });

  it("shows keyword filters and Update Search button after results load", async () => {
    renderWithRouter(<ResultsPage />);

    mockEventSource._emit("complete", { hotels: mockHotels, count: 1, cached: false });

    await waitFor(() => {
      expect(screen.getByText("Keywords")).toBeInTheDocument();
      expect(screen.getByText("Update Search")).toBeInTheDocument();
    });
  });

  it("creates EventSource with correct URL", () => {
    renderWithRouter(<ResultsPage />);

    expect(lastEventSourceUrl).toContain("/api/v1/searches/stream?location=Paris");
  });

  it("closes EventSource on unmount", () => {
    const { unmount } = renderWithRouter(<ResultsPage />);
    unmount();
    expect(mockEventSource.close).toHaveBeenCalled();
  });
});
