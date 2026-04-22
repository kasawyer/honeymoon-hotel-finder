// src/components/__tests__/Pagination.test.jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Pagination from "../Pagination";

describe("Pagination", () => {
    it("renders nothing when totalPages is 1", () => {
        const { container } = render(
            <Pagination currentPage={1} totalPages={1} onPageChange={() => {}} />
        );
        expect(container.innerHTML).toBe("");
    });

    it("renders nothing when totalPages is 0", () => {
        const { container } = render(
            <Pagination currentPage={1} totalPages={0} onPageChange={() => {}} />
        );
        expect(container.innerHTML).toBe("");
    });

    it("renders all page numbers for small page counts", () => {
        render(
            <Pagination currentPage={1} totalPages={3} onPageChange={() => {}} />
        );
        expect(screen.getByLabelText("Page 1")).toBeInTheDocument();
        expect(screen.getByLabelText("Page 2")).toBeInTheDocument();
        expect(screen.getByLabelText("Page 3")).toBeInTheDocument();
    });

    it("highlights the current page", () => {
        render(
            <Pagination currentPage={2} totalPages={3} onPageChange={() => {}} />
        );
        const page2 = screen.getByLabelText("Page 2");
        expect(page2).toHaveAttribute("aria-current", "page");
    });

    it("calls onPageChange when a page number is clicked", async () => {
        const user = userEvent.setup();
        const onPageChange = vi.fn();

        render(
            <Pagination currentPage={1} totalPages={3} onPageChange={onPageChange} />
        );
        await user.click(screen.getByLabelText("Page 3"));

        expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it("calls onPageChange with next page when next button is clicked", async () => {
        const user = userEvent.setup();
        const onPageChange = vi.fn();

        render(
            <Pagination currentPage={1} totalPages={3} onPageChange={onPageChange} />
        );
        await user.click(screen.getByLabelText("Next page"));

        expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it("calls onPageChange with previous page when prev button is clicked", async () => {
        const user = userEvent.setup();
        const onPageChange = vi.fn();

        render(
            <Pagination currentPage={2} totalPages={3} onPageChange={onPageChange} />
        );
        await user.click(screen.getByLabelText("Previous page"));

        expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it("disables previous button on first page", () => {
        render(
            <Pagination currentPage={1} totalPages={3} onPageChange={() => {}} />
        );
        expect(screen.getByLabelText("Previous page")).toBeDisabled();
    });

    it("disables next button on last page", () => {
        render(
            <Pagination currentPage={3} totalPages={3} onPageChange={() => {}} />
        );
        expect(screen.getByLabelText("Next page")).toBeDisabled();
    });

    it("shows ellipsis for many pages", () => {
        render(
            <Pagination currentPage={5} totalPages={10} onPageChange={() => {}} />
        );
        const ellipses = screen.getAllByText("...");
        expect(ellipses.length).toBeGreaterThanOrEqual(1);

        // First and last page always visible
        expect(screen.getByLabelText("Page 1")).toBeInTheDocument();
        expect(screen.getByLabelText("Page 10")).toBeInTheDocument();
    });
});