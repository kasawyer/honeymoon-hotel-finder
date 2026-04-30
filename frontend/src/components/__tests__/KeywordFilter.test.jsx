// src/components/__tests__/KeywordFilter.test.jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import KeywordFilter from "../KeywordFilter";

describe("KeywordFilter", () => {
  it("renders all keyword buttons", () => {
    render(<KeywordFilter selected={[]} onChange={() => {}} />);
    expect(screen.getByText(/Romantic/)).toBeInTheDocument();
    expect(screen.getByText(/Honeymoon/)).toBeInTheDocument();
    expect(screen.getByText(/Anniversary/)).toBeInTheDocument();
    expect(screen.getByText(/Luxury/)).toBeInTheDocument();
    expect(screen.getByText(/Spa/)).toBeInTheDocument();
    expect(screen.getByText(/Beachfront/)).toBeInTheDocument();
  });

  it("calls onChange with added keyword when an unselected keyword is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<KeywordFilter selected={["romantic"]} onChange={onChange} />);
    await user.click(screen.getByText(/Luxury/));

    expect(onChange).toHaveBeenCalledWith(["romantic", "luxury"]);
  });

  it("calls onChange with removed keyword when a selected keyword is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<KeywordFilter selected={["romantic", "honeymoon"]} onChange={onChange} />);
    await user.click(screen.getByText(/Romantic/));

    expect(onChange).toHaveBeenCalledWith(["honeymoon"]);
  });

  it("allows selecting multiple keywords", async () => {
    const user = userEvent.setup();
    const selected = [];
    const onChange = vi.fn((newSelected) => {
      selected.length = 0;
      selected.push(...newSelected);
    });

    const { rerender } = render(<KeywordFilter selected={selected} onChange={onChange} />);

    await user.click(screen.getByText(/Romantic/));
    expect(onChange).toHaveBeenLastCalledWith(["romantic"]);

    rerender(<KeywordFilter selected={["romantic"]} onChange={onChange} />);
    await user.click(screen.getByText(/Spa/));
    expect(onChange).toHaveBeenLastCalledWith(["romantic", "spa"]);
  });
});
