import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

const hotelsSamePrice = [
    { name: "Hotel A", price_per_night: 200 },
    { name: "Hotel B", price_per_night: 200 },
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

    it("renders nothing when hotels array is empty", () => {
        const { container } = render(
            <PriceFilter hotels={[]} onFilterChange={() => {}} />
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

    it("updates range when min slider changes", () => {
        const onFilterChange = vi.fn();
        render(<PriceFilter hotels={hotelsWithPrices} onFilterChange={onFilterChange} />);
        const sliders = screen.getAllByRole("slider");

        // Change min slider to 200
        fireEvent.change(sliders[0], { target: { value: "200" } });

        expect(onFilterChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ min: 200 })
        );
    });

    it("updates range when max slider changes", () => {
        const onFilterChange = vi.fn();
        render(<PriceFilter hotels={hotelsWithPrices} onFilterChange={onFilterChange} />);
        const sliders = screen.getAllByRole("slider");

        // Change max slider to 500
        fireEvent.change(sliders[1], { target: { value: "500" } });

        expect(onFilterChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ max: 500 })
        );
    });

    it("prevents min from exceeding max", () => {
        const onFilterChange = vi.fn();
        render(<PriceFilter hotels={hotelsWithPrices} onFilterChange={onFilterChange} />);
        const sliders = screen.getAllByRole("slider");

        // Try to set min higher than max (800)
        fireEvent.change(sliders[0], { target: { value: "900" } });

        // Min should be clamped to max - 1
        expect(onFilterChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ min: 799 })
        );
    });

    it("prevents max from going below min", () => {
        const onFilterChange = vi.fn();
        render(<PriceFilter hotels={hotelsWithPrices} onFilterChange={onFilterChange} />);
        const sliders = screen.getAllByRole("slider");

        // Set min to 300 first
        fireEvent.change(sliders[0], { target: { value: "300" } });
        // Try to set max below min
        fireEvent.change(sliders[1], { target: { value: "200" } });

        // Max should be clamped to min + 1
        expect(onFilterChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ max: 301 })
        );
    });

    it("resets range when hotels change", () => {
        const onFilterChange = vi.fn();
        const { rerender } = render(
            <PriceFilter hotels={hotelsWithPrices} onFilterChange={onFilterChange} />
        );

        // Initial call should be 100-800
        expect(onFilterChange).toHaveBeenCalledWith(
            expect.objectContaining({ min: 100, max: 800 })
        );

        // Rerender with different hotels
        const newHotels = [
            { name: "New Hotel A", price_per_night: 50 },
            { name: "New Hotel B", price_per_night: 400 },
        ];
        rerender(<PriceFilter hotels={newHotels} onFilterChange={onFilterChange} />);

        expect(onFilterChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ min: 50, max: 400 })
        );
    });

    it("handles hotels with the same price", () => {
        const onFilterChange = vi.fn();
        render(<PriceFilter hotels={hotelsSamePrice} onFilterChange={onFilterChange} />);
        expect(onFilterChange).toHaveBeenCalledWith(
            expect.objectContaining({ min: 200, max: 200 })
        );
    });

    it("shows correct count of hotels without prices", () => {
        const hotels = [
            { name: "A", price_per_night: 100 },
            { name: "B", price_per_night: null },
            { name: "C", price_per_night: null },
            { name: "D", price_per_night: null },
        ];
        render(<PriceFilter hotels={hotels} onFilterChange={() => {}} />);
        expect(screen.getByText(/Include 3 hotels without prices/)).toBeInTheDocument();
    });

    it("uses singular 'hotel' when only one lacks price", () => {
        render(<PriceFilter hotels={hotelsMixed} onFilterChange={() => {}} />);
        expect(screen.getByText(/Include 1 hotel without prices/)).toBeInTheDocument();
    });
});