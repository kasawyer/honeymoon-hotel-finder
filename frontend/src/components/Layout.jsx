// src/components/Layout.jsx
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--color-bg-warm)" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--color-border-warm)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <Heart className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
            <span className="font-editorial text-lg" style={{ color: "var(--color-text-main)" }}>
              Honeymoon Hotel Finder
            </span>
          </Link>
          <p className="hidden sm:block text-xs" style={{ color: "var(--color-text-muted)" }}>
            Reviews from Google, Booking.com & TripAdvisor
          </p>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--color-border-warm)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 text-center">
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Honeymoon Hotel Finder — Aggregating reviews from Google, Booking.com & TripAdvisor
          </p>
        </div>
      </footer>
    </div>
  );
}
