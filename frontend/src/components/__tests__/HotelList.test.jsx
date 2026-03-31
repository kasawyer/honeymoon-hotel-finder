// src/components/__tests__/HotelList.test.jsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HotelList from "../HotelList";

const hotels = [
    {
        name: "Hotel Alpha",
        combined_rating: 4.5,
        total_reviews: 1000,
        source_ratings: [{ source: "google", rating: 4.5, count: 1000 }],
        sources: ["google"],
        image_url: null,
        price_per_night: 200,
        url: null,
        external_id: "1",
        source: "tripadvisor",
    },
    {
        name: "Hotel Beta",
        combined_rating: 4.2,
        total_reviews: 500,
        source_ratings: [{ source: "google", rating: 4.2, count: 500 }],
        sources: ["google"],
        image_url: null,
        price_per_night: 150,
        url: null,
        external_id: "2",
        source: "tripadvisor",
    },
];

describe("HotelList", () => {
    it("renders a card for each hotel", () => {
        render(<HotelList hotels={hotels} loading={false} />);
        expect(screen.getByText("Hotel Alpha")).toBeInTheDocument();
        expect(screen.getByText("Hotel Beta")).toBeInTheDocument();
    });

    it("shows skeleton loaders when loading", () => {
        const { container } = render(<HotelList hotels={[]} loading={true} />);
        const skeletons = container.querySelectorAll(".animate-pulse");
        expect(skeletons.length).toBe(6);
    });

    it("shows empty state when no hotels and not loading", () => {
        render(<HotelList hotels={[]} loading={false} />);
        expect(screen.getByText("No hotels found")).toBeInTheDocument();
        expect(screen.getByText(/Try a different location/)).toBeInTheDocument();
    });

    it("shows empty state when hotels is null", () => {
        render(<HotelList hotels={null} loading={false} />);
        expect(screen.getByText("No hotels found")).toBeInTheDocument();
    });
});