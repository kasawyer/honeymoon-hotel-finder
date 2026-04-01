// src/components/__tests__/RatingFilter.test.jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RatingFilter from "../RatingFilter";

const hotels = [
    { name: "Hotel A", combined_rating: 4.8 },
    { name: "Hotel B", combined_rating: 4.2 },
    { name: "Hotel C", combined_rating: 3.7 },
    { name: "Hotel D", combined_rating: 3.0 },
    { name: "Hotel E", combined_rating: null },
];

describe("RatingFilter", () => {
    it("renders the heading", () => {
        render(<RatingFilter value={0} onChange={() => {}} hotels={hotels} />);
        expect(screen.getByText("Minimum rating")).toBeInTheDocument();
    });

    it("renders all rating options", () => {
        render(<RatingFilter value={0} onChange={() => {}} hotels={hotels} />);
        expect(screen.getByText("All")).toBeInTheDocument();
        expect(screen.getByText("3.0+")).toBeInTheDocument();
        expect(screen.getByText("3.5+")).toBeInTheDocument();
        expect(screen.getByText("4.0+")).toBeInTheDocument();
        expect(screen.getByText("4.5+")).toBeInTheDocument();
        expect(screen.getByText("5.0")).toBeInTheDocument();
    });

    it("shows hotel count for each threshold", () => {
        render(<RatingFilter value={0} onChange={() => {}} hotels={hotels} />);
        // 4 hotels have ratings: 4.8, 4.2, 3.7, 3.0
        // "All" and "3.0+" both show (4), so use getAllByText
        expect(screen.getAllByText("(4)").length).toBe(2);  // All + 3.0+
        expect(screen.getByText("(3)")).toBeInTheDocument();  // 3.5+
        expect(screen.getByText("(2)")).toBeInTheDocument();  // 4.0+
        expect(screen.getByText("(1)")).toBeInTheDocument();  // 4.5+
        expect(screen.getByText("(0)")).toBeInTheDocument();  // 5.0
    });

    it("calls onChange with the selected rating value", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        render(<RatingFilter value={0} onChange={onChange} hotels={hotels} />);
        await user.click(screen.getByText("4.0+"));

        expect(onChange).toHaveBeenCalledWith(4.0);
    });

    it("calls onChange with 0 when clicking the active filter (deselect)", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        render(<RatingFilter value={4.0} onChange={onChange} hotels={hotels} />);
        await user.click(screen.getByText("4.0+"));

        expect(onChange).toHaveBeenCalledWith(0);
    });

    it("disables options with zero matching hotels", () => {
        const highRatedOnly = [{ name: "Hotel A", combined_rating: 3.2 }];
        render(<RatingFilter value={0} onChange={() => {}} hotels={highRatedOnly} />);

        // 4.0+, 4.5+, 5.0 should all have (0) and be disabled
        const button45 = screen.getByText("4.5+").closest("button");
        expect(button45).toBeDisabled();

        const button50 = screen.getByText("5.0").closest("button");
        expect(button50).toBeDisabled();
    });

    it("shows hidden hotels message when filter is active and hotels lack ratings", () => {
        render(<RatingFilter value={4.0} onChange={() => {}} hotels={hotels} />);
        expect(screen.getByText(/1 hotel without ratings hidden/)).toBeInTheDocument();
    });

    it("does not show hidden message when filter is set to Any", () => {
        render(<RatingFilter value={0} onChange={() => {}} hotels={hotels} />);
        expect(screen.queryByText(/without ratings hidden/)).not.toBeInTheDocument();
    });
});