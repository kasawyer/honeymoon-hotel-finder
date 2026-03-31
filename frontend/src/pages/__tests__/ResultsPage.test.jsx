// src/pages/__tests__/ResultsPage.test.jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../test/test-utils";
import ResultsPage from "../ResultsPage";

// Mock the API client
vi.mock("../../api/client", () => ({
    searchHotels: vi.fn(),
    searchLocations: vi.fn().mockResolvedValue([]),
}));

// Mock Google Maps
vi.mock("@react-google-maps/api", () => ({
    GoogleMap: ({ children }) => <div data-testid="google-map">{children}</div>,
    MarkerF: () => <div data-testid="map-marker" />,
    InfoWindowF: ({ children }) => <div>{children}</div>,
    useLoadScript: () => ({ isLoaded: true, loadError: null }),
}));

import { searchHotels } from "../../api/client";

// Mock useSearchParams to provide location
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useSearchParams: () => [
            new URLSearchParams("location=Paris&keywords=romantic,honeymoon"),
        ],
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

describe("ResultsPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows loading state while searching", () => {
        searchHotels.mockReturnValue(new Promise(() => {})); // Never resolves

        renderWithRouter(<ResultsPage />);
        expect(screen.getByText(/Searching across all providers/i)).toBeInTheDocument();
    });

    it("displays hotel results after loading", async () => {
        searchHotels.mockResolvedValue({ hotels: mockHotels });

        renderWithRouter(<ResultsPage />);

        await waitFor(() => {
            expect(screen.getByText("Le Bristol Paris")).toBeInTheDocument();
        });
    });

    it("shows result count after loading", async () => {
        searchHotels.mockResolvedValue({ hotels: mockHotels });

        renderWithRouter(<ResultsPage />);

        await waitFor(() => {
            expect(screen.getByText(/1 hotel found/)).toBeInTheDocument();
        });
    });

    it("shows error message on API failure", async () => {
        searchHotels.mockRejectedValue(new Error("Network error"));

        renderWithRouter(<ResultsPage />);

        await waitFor(() => {
            expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
        });
    });

    it("shows rate limit error for 429 responses", async () => {
        const error = new Error("Rate limited");
        error.response = { status: 429 };
        searchHotels.mockRejectedValue(error);

        renderWithRouter(<ResultsPage />);

        await waitFor(() => {
            expect(screen.getByText(/Too many searches/i)).toBeInTheDocument();
        });
    });

    it("shows retry button on error", async () => {
        searchHotels.mockRejectedValue(new Error("fail"));

        renderWithRouter(<ResultsPage />);

        await waitFor(() => {
            // "Try again" appears in both the error message text and the retry button
            const retryButton = screen.getByRole("button", { name: /try again/i });
            expect(retryButton).toBeInTheDocument();
        });
    });

    it("renders the search bar with location prefilled", () => {
        searchHotels.mockResolvedValue({ hotels: [] });

        renderWithRouter(<ResultsPage />);
        expect(screen.getByDisplayValue("Paris")).toBeInTheDocument();
    });

    it("renders grid/map view toggle buttons", async () => {
        searchHotels.mockResolvedValue({ hotels: mockHotels });

        renderWithRouter(<ResultsPage />);

        await waitFor(() => {
            expect(screen.getByTitle("Grid view")).toBeInTheDocument();
            expect(screen.getByTitle("Map view")).toBeInTheDocument();
        });
    });

    it("shows empty state when no hotels found", async () => {
        searchHotels.mockResolvedValue({ hotels: [] });

        renderWithRouter(<ResultsPage />);

        await waitFor(() => {
            expect(screen.getByText("No hotels found")).toBeInTheDocument();
        });
    });
});