// src/pages/__tests__/HomePage.test.jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../test/test-utils";
import HomePage from "../HomePage";

// Mock the API client
vi.mock("../../api/client", () => ({
    searchLocations: vi.fn().mockResolvedValue([]),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe("HomePage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders the hero heading", () => {
        renderWithRouter(<HomePage />);
        expect(screen.getByText(/Find Your Dream Honeymoon Hotel/i)).toBeInTheDocument();
    });

    it("renders the subtitle", () => {
        renderWithRouter(<HomePage />);
        expect(screen.getByText(/Search across Booking.com, TripAdvisor/i)).toBeInTheDocument();
    });

    it("renders the search bar", () => {
        renderWithRouter(<HomePage />);
        expect(screen.getByPlaceholderText(/where's the honeymoon/i)).toBeInTheDocument();
    });

    it("renders keyword filter buttons", () => {
        renderWithRouter(<HomePage />);
        expect(screen.getByText(/Romantic/)).toBeInTheDocument();
        // "Honeymoon" appears in both the heading and the filter button
        expect(screen.getAllByText(/Honeymoon/).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/Anniversary/)).toBeInTheDocument();
    });

    it("renders popular destination buttons", () => {
        renderWithRouter(<HomePage />);
        expect(screen.getByText(/Maldives/)).toBeInTheDocument();
        expect(screen.getByText(/Santorini/)).toBeInTheDocument();
        expect(screen.getByText(/Bali/)).toBeInTheDocument();
        expect(screen.getByText(/Paris/)).toBeInTheDocument();
    });

    it("navigates to results when a popular destination is clicked", async () => {
        const user = userEvent.setup();

        renderWithRouter(<HomePage />);
        await user.click(screen.getByText(/Maldives/));

        expect(mockNavigate).toHaveBeenCalledWith(
            expect.stringContaining("/results?")
        );
        expect(mockNavigate).toHaveBeenCalledWith(
            expect.stringContaining("location=Maldives")
        );
    });

    it("navigates to results when search is submitted", async () => {
        const user = userEvent.setup();

        renderWithRouter(<HomePage />);
        const input = screen.getByPlaceholderText(/where's the honeymoon/i);

        await user.type(input, "Bora Bora");
        await user.keyboard("{Enter}");

        expect(mockNavigate).toHaveBeenCalledWith(
            expect.stringContaining("location=Bora+Bora")
        );
    });

    it("includes selected keywords in navigation URL", async () => {
        const user = userEvent.setup();

        renderWithRouter(<HomePage />);

        // Default keywords are romantic, honeymoon, anniversary
        const input = screen.getByPlaceholderText(/where's the honeymoon/i);
        await user.type(input, "Paris");
        await user.keyboard("{Enter}");

        expect(mockNavigate).toHaveBeenCalledWith(
            expect.stringContaining("keywords=")
        );
    });
});