// src/components/__tests__/HotelCard.test.jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HotelCard from "../HotelCard";

const fullHotel = {
    name: "Le Bristol Paris",
    address: "112 Rue du Faubourg Saint-Honoré, Paris",
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
    url: "https://www.booking.com/hotel/fr/le-bristol-paris.html",
    external_id: "197528",
    source: "tripadvisor",
};

const minimalHotel = {
    name: "Budget Inn",
    address: null,
    combined_rating: null,
    total_reviews: 0,
    source_ratings: [],
    sources: ["tripadvisor"],
    image_url: null,
    price_per_night: null,
    url: null,
    external_id: "999",
    source: "tripadvisor",
};

describe("HotelCard", () => {
    describe("rendering", () => {
        it("displays the hotel name", () => {
            render(<HotelCard hotel={fullHotel} />);
            expect(screen.getByText("Le Bristol Paris")).toBeInTheDocument();
        });

        it("displays the address", () => {
            render(<HotelCard hotel={fullHotel} />);
            expect(screen.getByText(/112 Rue du Faubourg/)).toBeInTheDocument();
        });

        it("displays the combined rating", () => {
            render(<HotelCard hotel={fullHotel} />);
            // Combined rating appears in the main display, plus per-source breakdown
            const ratings = screen.getAllByText("4.7");
            expect(ratings.length).toBeGreaterThanOrEqual(1);
        });

        it("displays the total review count", () => {
            render(<HotelCard hotel={fullHotel} />);
            expect(screen.getByText(/5,078 reviews/)).toBeInTheDocument();
        });

        it("displays the price per night", () => {
            render(<HotelCard hotel={fullHotel} />);
            expect(screen.getByText("$1660")).toBeInTheDocument();
            expect(screen.getByText("per night")).toBeInTheDocument();
        });

        it("displays source badges for all providers", () => {
            render(<HotelCard hotel={fullHotel} />);
            // Source names appear in both badges and breakdown pills
            expect(screen.getAllByText("TripAdvisor").length).toBeGreaterThanOrEqual(1);
            expect(screen.getAllByText("Google").length).toBeGreaterThanOrEqual(1);
            expect(screen.getAllByText("Booking.com").length).toBeGreaterThanOrEqual(1);
        });

        it("displays per-source rating breakdown when multiple sources", () => {
            render(<HotelCard hotel={fullHotel} />);
            // Each source shows its individual rating
            const ratings = screen.getAllByText("4.7");
            expect(ratings.length).toBeGreaterThanOrEqual(1);
            expect(screen.getByText("4.9")).toBeInTheDocument();
        });

        it("displays 'View details' link when URL exists", () => {
            render(<HotelCard hotel={fullHotel} />);
            expect(screen.getByText("View details")).toBeInTheDocument();
        });
    });

    describe("minimal data", () => {
        it("displays 'No rating' when combined_rating is null", () => {
            render(<HotelCard hotel={minimalHotel} />);
            expect(screen.getByText("No rating")).toBeInTheDocument();
        });

        it("does not display address when null", () => {
            render(<HotelCard hotel={minimalHotel} />);
            expect(screen.queryByText(/Rue/)).not.toBeInTheDocument();
        });

        it("does not display price when null", () => {
            render(<HotelCard hotel={minimalHotel} />);
            expect(screen.queryByText("per night")).not.toBeInTheDocument();
        });

        it("does not display 'View details' when URL is null", () => {
            render(<HotelCard hotel={minimalHotel} />);
            expect(screen.queryByText("View details")).not.toBeInTheDocument();
        });

        it("does not display per-source breakdown with only one source", () => {
            render(<HotelCard hotel={minimalHotel} />);
            // The breakdown pills only show when sourceRatings.length > 1
            expect(screen.queryByText("TripAdvisor")).toBeInTheDocument(); // badge
            expect(screen.queryByText("Google")).not.toBeInTheDocument();
        });
    });

    describe("interactions", () => {
        it("opens booking URL in new tab when card is clicked", async () => {
            const user = userEvent.setup();
            const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

            render(<HotelCard hotel={fullHotel} />);
            await user.click(screen.getByText("Le Bristol Paris"));

            expect(openSpy).toHaveBeenCalledWith(
                fullHotel.url,
                "_blank",
                "noopener,noreferrer"
            );
            openSpy.mockRestore();
        });

        it("does not open a window when hotel has no URL", async () => {
            const user = userEvent.setup();
            const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

            render(<HotelCard hotel={minimalHotel} />);
            await user.click(screen.getByText("Budget Inn"));

            expect(openSpy).not.toHaveBeenCalled();
            openSpy.mockRestore();
        });
    });

    describe("image handling", () => {
        it("renders image when image_url is provided", () => {
            render(<HotelCard hotel={fullHotel} />);
            const img = screen.getByAltText("Le Bristol Paris");
            expect(img).toBeInTheDocument();
            expect(img).toHaveAttribute("src", fullHotel.image_url);
        });

        it("does not render an img tag when image_url is null", () => {
            render(<HotelCard hotel={minimalHotel} />);
            expect(screen.queryByAltText("Budget Inn")).not.toBeInTheDocument();
        });
    });
});