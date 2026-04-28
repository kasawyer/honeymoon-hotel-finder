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

    it("shows loading spinner while fetching suggestions", async () => {
        const user = userEvent.setup();
        // Create a promise that doesn't resolve immediately
        let resolveSearch;
        searchLocations.mockImplementation(
            () => new Promise((resolve) => { resolveSearch = resolve; })
        );

        const { container } = render(<SearchBar onSearch={() => {}} />);
        const input = screen.getByPlaceholderText(/where's the honeymoon/i);

        await user.type(input, "Paris");

        // Wait for the debounce to fire
        await waitFor(() => {
            expect(searchLocations).toHaveBeenCalled();
        });

        // Spinner should be visible while loading
        const spinner = container.querySelector(".animate-spin");
        expect(spinner).toBeInTheDocument();

        // Resolve and spinner should disappear
        resolveSearch([]);
        await waitFor(() => {
            expect(container.querySelector(".animate-spin")).not.toBeInTheDocument();
        });
    });

    it("navigates suggestions with arrow keys", async () => {
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
        });

        // Arrow down to first suggestion
        await user.keyboard("{ArrowDown}");
        // Arrow down to second suggestion
        await user.keyboard("{ArrowDown}");
        // Arrow up back to first
        await user.keyboard("{ArrowUp}");
        // Enter to select
        await user.keyboard("{Enter}");

        expect(input).toHaveValue("Paris, France");
    });

    it("closes suggestions on Escape key", async () => {
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

        await user.keyboard("{Escape}");

        expect(screen.queryByText("Paris, France")).not.toBeInTheDocument();
    });

    it("closes suggestions when clicking outside", async () => {
        const user = userEvent.setup();
        searchLocations.mockResolvedValue([
            { place_id: "abc", description: "Paris, France" },
        ]);

        render(
            <div>
                <div data-testid="outside">Outside area</div>
                <SearchBar onSearch={() => {}} />
            </div>
        );
        const input = screen.getByPlaceholderText(/where's the honeymoon/i);

        await user.type(input, "Paris");

        await waitFor(() => {
            expect(screen.getByText("Paris, France")).toBeInTheDocument();
        });

        await user.click(screen.getByTestId("outside"));

        expect(screen.queryByText("Paris, France")).not.toBeInTheDocument();
    });

    it("handles API errors gracefully", async () => {
        const user = userEvent.setup();
        searchLocations.mockRejectedValue(new Error("Network error"));

        render(<SearchBar onSearch={() => {}} />);
        const input = screen.getByPlaceholderText(/where's the honeymoon/i);

        await user.type(input, "Paris");

        // Should not crash — just shows no suggestions
        await waitFor(() => {
            expect(searchLocations).toHaveBeenCalled();
        });

        expect(screen.queryByText("Paris, France")).not.toBeInTheDocument();
    });

    it("trims whitespace from search query", async () => {
        const user = userEvent.setup();
        const onSearch = vi.fn();

        render(<SearchBar onSearch={onSearch} />);
        const input = screen.getByPlaceholderText(/where's the honeymoon/i);

        await user.type(input, "  Bali  ");
        await user.keyboard("{Enter}");

        expect(onSearch).toHaveBeenCalledWith("Bali");
    });

    it("reopens suggestions on focus if suggestions exist", async () => {
        const user = userEvent.setup();
        searchLocations.mockResolvedValue([
            { place_id: "abc", description: "Paris, France" },
        ]);

        render(
            <div>
                <button data-testid="other">Other</button>
                <SearchBar onSearch={() => {}} />
            </div>
        );
        const input = screen.getByPlaceholderText(/where's the honeymoon/i);

        await user.type(input, "Paris");

        await waitFor(() => {
            expect(screen.getByText("Paris, France")).toBeInTheDocument();
        });

        // Click away to close
        await user.click(screen.getByTestId("other"));
        expect(screen.queryByText("Paris, France")).not.toBeInTheDocument();

        // Focus back on input
        await user.click(input);

        await waitFor(() => {
            expect(screen.getByText("Paris, France")).toBeInTheDocument();
        });
    });
});