import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    render(<HotelList hotels={hotels} loading={false} location="Paris" onSearch={() => {}} />);
    expect(screen.getByText("Hotel Alpha")).toBeInTheDocument();
    expect(screen.getByText("Hotel Beta")).toBeInTheDocument();
  });

  it("shows skeleton loaders when loading", () => {
    const { container } = render(
      <HotelList hotels={[]} loading={true} location="Paris" onSearch={() => {}} />
    );
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(6);
  });

  it("shows no results state with destination suggestions when empty", () => {
    render(<HotelList hotels={[]} loading={false} location="Paris" onSearch={() => {}} />);
    expect(screen.getByText("No hotels found")).toBeInTheDocument();
    expect(screen.getByText(/Try one of these/)).toBeInTheDocument();
  });

  it("shows no results state when hotels is null", () => {
    render(<HotelList hotels={null} loading={false} location="Paris" onSearch={() => {}} />);
    expect(screen.getByText("No hotels found")).toBeInTheDocument();
  });

  it("shows the searched location in the no results message", () => {
    render(<HotelList hotels={[]} loading={false} location="Santorini" onSearch={() => {}} />);
    expect(screen.getByText("Santorini")).toBeInTheDocument();
  });

  it("suggests region-appropriate destinations", () => {
    render(
      <HotelList hotels={[]} loading={false} location="Santorini, Greece" onSearch={() => {}} />
    );
    // Should suggest other European destinations
    expect(screen.getByText(/Paris, France/)).toBeInTheDocument();
    expect(screen.getByText(/Amalfi Coast/)).toBeInTheDocument();
    // Santorini should not appear as a suggestion button
    const suggestionButtons = screen.getAllByRole("button");
    const santoriniButton = suggestionButtons.find((btn) => btn.textContent.includes("Santorini"));
    expect(santoriniButton).toBeUndefined();
  });

  it("calls onSearch when a suggestion is clicked", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(<HotelList hotels={[]} loading={false} location="Unknown Place" onSearch={onSearch} />);

    await user.click(screen.getByText(/Paris, France/));
    expect(onSearch).toHaveBeenCalledWith("Paris, France");
  });
});
