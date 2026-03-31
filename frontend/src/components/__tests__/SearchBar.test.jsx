// src/components/__tests__/SearchBar.test.jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchBar from "../SearchBar";

// Mock the API client
vi.mock("../../api/client", () => ({
    searchLocations: vi.fn(),
}));

import { searchLocations } from "../../api/client";

describe("SearchBar", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders the input with placeholder text", () => {
        render(<SearchBar onSearch={() => {}} />);
        expect(
            screen.getByPlaceholderText(/where's the honeymoon/i)
        ).toBeInTheDocument();
    });

    it("renders with initial value", () => {
        render(<SearchBar onSearch={() => {}} initialValue="Paris" />);
        expect(screen.getByDisplayValue("Paris")).toBeInTheDocument();
    });

    it("calls onSearch when form is submitted", async () => {
        const user = userEvent.setup();
        const onSearch = vi.fn();

        render(<SearchBar onSearch={onSearch} />);
        const input = screen.getByPlaceholderText(/where's the honeymoon/i);

        await user.type(input, "Bali");
        await user.keyboard("{Enter}");

        expect(onSearch).toHaveBeenCalledWith("Bali");
    });

    it("does not call onSearch when input is empty", async () => {
        const user = userEvent.setup();
        const onSearch = vi.fn();

        render(<SearchBar onSearch={onSearch} />);
        await user.keyboard("{Enter}");

        expect(onSearch).not.toHaveBeenCalled();
    });

    it("shows autocomplete suggestions after typing", async () => {
        const user = userEvent.setup();
        searchLocations.mockResolvedValue([
            { place_id: "abc", description: "Paris, France" },
            { place_id: "def", description: "Paris, TX, USA" },
        ]);

        render(<SearchBar onSearch={() => {}} />);
        const input = screen.getByPlaceholderText(/where's the honeymoon/i);

        await user.type(input, "Paris");

        await waitFor(() => {
            expect(screen.getByText("Paris, France")).toBeInTheDocument();
            expect(screen.getByText("Paris, TX, USA")).toBeInTheDocument();
        });
    });

    it("fills input when a suggestion is clicked", async () => {
        const user = userEvent.setup();
        searchLocations.mockResolvedValue([
            { place_id: "abc", description: "Paris, France" },
        ]);

        render(<SearchBar onSearch={() => {}} />);
        const input = screen.getByPlaceholderText(/where's the honeymoon/i);

        await user.type(input, "Paris");

        await waitFor(() => {
            expect(screen.getByText("Paris, France")).toBeInTheDocument();
        });

        await user.click(screen.getByText("Paris, France"));

        expect(input).toHaveValue("Paris, France");
    });

    it("hides suggestions after a suggestion is clicked", async () => {
        const user = userEvent.setup();
        searchLocations.mockResolvedValue([
            { place_id: "abc", description: "Paris, France" },
        ]);

        render(<SearchBar onSearch={() => {}} />);
        const input = screen.getByPlaceholderText(/where's the honeymoon/i);

        await user.type(input, "Paris");

        await waitFor(() => {
            expect(screen.getByText("Paris, France")).toBeInTheDocument();
        });

        await user.click(screen.getByText("Paris, France"));

        expect(screen.queryByText("Paris, France")).not.toBeInTheDocument();
    });

    it("does not fetch suggestions for input shorter than 2 characters", async () => {
        const user = userEvent.setup();

        render(<SearchBar onSearch={() => {}} />);
        const input = screen.getByPlaceholderText(/where's the honeymoon/i);

        await user.type(input, "P");

        // Wait a bit longer than the debounce
        await new Promise((r) => setTimeout(r, 400));

        expect(searchLocations).not.toHaveBeenCalled();
    });
});