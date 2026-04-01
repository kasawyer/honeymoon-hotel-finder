// src/components/__tests__/PriceFilter.test.jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PriceFilter from "../PriceFilter";

const hotelsWithPrices = [
    { name: "Cheap Hotel", price_per_night: 100 },
    { name: "Mid Hotel", price_per_night: 300 },
    { name: "Expensive Hotel", price_per_night: 800 },
];

const hotelsMixed = [
    { name: "Cheap Hotel", price_per_night: 100 },
    { name: "No Price Hotel", price_per_night: null },
    { name: "Expensive Hotel", price_per_night: 500 },
];

const hotelsNoPrices = [
    { name: "Hotel A", price_per_night: null },
    { name: "Hotel B", price_per_night: null },
];

describe("PriceFilter", () => {
    it("renders the price range label", () => {
        render(<PriceFilter hotels={hotelsWithPrices} onFilterChange={() => {}} />);
        expect(screen.getByText("Price per night")).toBeInTheDocument();
    });

    it("shows the min and max price from hotels", () => {
        render(<PriceFilter hotels={hotelsWithPrices} onFilterChange={() => {}} />);
        expect(screen.getByText("$100")).toBeInTheDocument();
        expect(screen.getByText("$800")).toBeInTheDocument();
    });

    it("displays the current range", () => {
        render(<PriceFilter hotels={hotelsWithPrices} onFilterChange={() => {}} />);
        expect(screen.getByText("$100 — $800")).toBeInTheDocument();
    });

    it("renders nothing when no hotels have prices", () => {
        const { container } = render(
            <PriceFilter hotels={hotelsNoPrices} onFilterChange={() => {}} />
        );
        expect(container.innerHTML).toBe("");
    });

    it("shows checkbox for hotels without prices when some lack prices", () => {
        render(<PriceFilter hotels={hotelsMixed} onFilterChange={() => {}} />);
        expect(screen.getByText(/Include 1 hotel without prices/)).toBeInTheDocument();
    });

    it("does not show checkbox when all hotels have prices", () => {
        render(<PriceFilter hotels={hotelsWithPrices} onFilterChange={() => {}} />);
        expect(screen.queryByText(/Include.*without prices/)).not.toBeInTheDocument();
    });

    it("calls onFilterChange on mount with initial range", () => {
        const onFilterChange = vi.fn();
        render(<PriceFilter hotels={hotelsWithPrices} onFilterChange={onFilterChange} />);
        expect(onFilterChange).toHaveBeenCalledWith({
            min: 100,
            max: 800,
            includeNoPrices: true,
        });
    });

    it("toggles includeNoPrices checkbox", async () => {
        const user = userEvent.setup();
        const onFilterChange = vi.fn();

        render(<PriceFilter hotels={hotelsMixed} onFilterChange={onFilterChange} />);
        const checkbox = screen.getByRole("checkbox");

        expect(checkbox).toBeChecked();
        await user.click(checkbox);
        expect(checkbox).not.toBeChecked();

        expect(onFilterChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ includeNoPrices: false })
        );
    });

    it("renders two range sliders", () => {
        render(<PriceFilter hotels={hotelsWithPrices} onFilterChange={() => {}} />);
        const sliders = screen.getAllByRole("slider");
        expect(sliders).toHaveLength(2);
    });
});