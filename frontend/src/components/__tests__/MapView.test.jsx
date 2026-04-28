import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MapView from "../MapView";

// Mock Google Maps
vi.mock("@react-google-maps/api", () => ({
    GoogleMap: ({ children, center, zoom }) => (
        <div data-testid="google-map" data-center={JSON.stringify(center)} data-zoom={zoom}>
            {children}
        </div>
    ),
    MarkerF: ({ position, onClick, title }) => (
        <button
            data-testid={`marker-${title || "unknown"}`}
            data-lat={position.lat}
            data-lng={position.lng}
            onClick={onClick}
        >
            {title}
        </button>
    ),
    InfoWindowF: ({ children, onCloseClick }) => (
        <div data-testid="info-window">
            <button data-testid="info-window-close" onClick={onCloseClick}>Close</button>
            {children}
        </div>
    ),
    useLoadScript: vi.fn(),
}));

import { useLoadScript } from "@react-google-maps/api";

const hotelsWithCoords = [
    {
        name: "Hotel Alpha",
        latitude: 48.86,
        longitude: 2.35,
        combined_rating: 4.5,
        total_reviews: 1000,
        sources: ["google"],
        price_per_night: 200,
        source: "tripadvisor",
        external_id: "1",
        url: "https://booking.com/alpha",
    },
    {
        name: "Hotel Beta",
        latitude: 48.87,
        longitude: 2.34,
        combined_rating: 4.2,
        total_reviews: 500,
        sources: ["google", "booking"],
        price_per_night: 150,
        source: "tripadvisor",
        external_id: "2",
        url: null,
    },
];

const hotelsNoCoords = [
    {
        name: "Hotel Gamma",
        latitude: null,
        longitude: null,
        combined_rating: 4.0,
        sources: ["tripadvisor"],
        source: "tripadvisor",
        external_id: "3",
    },
];

const mixedHotels = [...hotelsWithCoords, ...hotelsNoCoords];

describe("MapView", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("when Google Maps is loaded", () => {
        beforeEach(() => {
            useLoadScript.mockReturnValue({ isLoaded: true, loadError: null });
        });

        it("renders the Google Map", () => {
            render(<MapView hotels={hotelsWithCoords} />);
            expect(screen.getByTestId("google-map")).toBeInTheDocument();
        });

        it("renders a marker for each hotel with coordinates", () => {
            render(<MapView hotels={hotelsWithCoords} />);
            expect(screen.getByTestId("marker-Hotel Alpha")).toBeInTheDocument();
            expect(screen.getByTestId("marker-Hotel Beta")).toBeInTheDocument();
        });

        it("does not render markers for hotels without coordinates", () => {
            render(<MapView hotels={hotelsNoCoords} />);
            expect(screen.queryByTestId("marker-Hotel Gamma")).not.toBeInTheDocument();
        });

        it("shows warning when no hotels have coordinates", () => {
            render(<MapView hotels={hotelsNoCoords} />);
            expect(screen.getByText(/No hotels have map coordinates/)).toBeInTheDocument();
        });

        it("does not show warning when hotels have coordinates", () => {
            render(<MapView hotels={hotelsWithCoords} />);
            expect(screen.queryByText(/No hotels have map coordinates/)).not.toBeInTheDocument();
        });

        it("centers map on average of hotel coordinates", () => {
            render(<MapView hotels={hotelsWithCoords} />);
            const map = screen.getByTestId("google-map");
            const center = JSON.parse(map.dataset.center);
            // Average of 48.86 and 48.87
            expect(center.lat).toBeCloseTo(48.865, 2);
            // Average of 2.35 and 2.34
            expect(center.lng).toBeCloseTo(2.345, 2);
        });

        it("sets zoom to 12 when hotels have coordinates", () => {
            render(<MapView hotels={hotelsWithCoords} />);
            const map = screen.getByTestId("google-map");
            expect(map.dataset.zoom).toBe("12");
        });

        it("sets zoom to 3 when no hotels have coordinates", () => {
            render(<MapView hotels={hotelsNoCoords} />);
            const map = screen.getByTestId("google-map");
            expect(map.dataset.zoom).toBe("3");
        });

        it("shows InfoWindow when a marker is clicked", async () => {
            const user = userEvent.setup();
            render(<MapView hotels={hotelsWithCoords} />);

            await user.click(screen.getByTestId("marker-Hotel Alpha"));

            expect(screen.getByTestId("info-window")).toBeInTheDocument();
            // Hotel name appears in both marker and InfoWindow, verify via getAllByText
            expect(screen.getAllByText("Hotel Alpha").length).toBe(2);
        });

        it("shows rating in InfoWindow", async () => {
            const user = userEvent.setup();
            render(<MapView hotels={hotelsWithCoords} />);

            await user.click(screen.getByTestId("marker-Hotel Alpha"));

            expect(screen.getByText("4.5")).toBeInTheDocument();
        });

        it("shows price in InfoWindow", async () => {
            const user = userEvent.setup();
            render(<MapView hotels={hotelsWithCoords} />);

            await user.click(screen.getByTestId("marker-Hotel Alpha"));

            expect(screen.getByText("$200/night")).toBeInTheDocument();
        });

        it("shows source count in InfoWindow for multi-source hotels", async () => {
            const user = userEvent.setup();
            render(<MapView hotels={hotelsWithCoords} />);

            await user.click(screen.getByTestId("marker-Hotel Beta"));

            expect(screen.getByText("(2 sources)")).toBeInTheDocument();
        });

        it("closes InfoWindow when close button is clicked", async () => {
            const user = userEvent.setup();
            render(<MapView hotels={hotelsWithCoords} />);

            await user.click(screen.getByTestId("marker-Hotel Alpha"));
            expect(screen.getByTestId("info-window")).toBeInTheDocument();

            await user.click(screen.getByTestId("info-window-close"));
            expect(screen.queryByTestId("info-window")).not.toBeInTheDocument();
        });

        it("switches InfoWindow when clicking a different marker", async () => {
            const user = userEvent.setup();
            render(<MapView hotels={hotelsWithCoords} />);

            await user.click(screen.getByTestId("marker-Hotel Alpha"));
            expect(screen.getAllByText("Hotel Alpha").length).toBe(2);

            await user.click(screen.getByTestId("marker-Hotel Beta"));
            // Alpha should now only appear once (marker), Beta appears twice (marker + InfoWindow)
            expect(screen.getAllByText("Hotel Alpha").length).toBe(1);
            expect(screen.getAllByText("Hotel Beta").length).toBe(2);
        });

        it("handles empty hotels array", () => {
            render(<MapView hotels={[]} />);
            expect(screen.getByTestId("google-map")).toBeInTheDocument();
            expect(screen.getByText(/No hotels have map coordinates/)).toBeInTheDocument();
        });

        it("skips hotels without coordinates in marker rendering", () => {
            render(<MapView hotels={mixedHotels} />);
            expect(screen.getByTestId("marker-Hotel Alpha")).toBeInTheDocument();
            expect(screen.getByTestId("marker-Hotel Beta")).toBeInTheDocument();
            expect(screen.queryByTestId("marker-Hotel Gamma")).not.toBeInTheDocument();
        });
    });

    describe("when Google Maps is loading", () => {
        it("shows loading indicator", () => {
            useLoadScript.mockReturnValue({ isLoaded: false, loadError: null });
            const { container } = render(<MapView hotels={hotelsWithCoords} />);
            const spinner = container.querySelector(".animate-spin");
            expect(spinner).toBeInTheDocument();
        });
    });

    describe("when Google Maps fails to load", () => {
        it("shows error message", () => {
            useLoadScript.mockReturnValue({ isLoaded: false, loadError: new Error("Failed") });
            render(<MapView hotels={hotelsWithCoords} />);
            expect(screen.getByText("Failed to load Google Maps")).toBeInTheDocument();
        });
    });
});