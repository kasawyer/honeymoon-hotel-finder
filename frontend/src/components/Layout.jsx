// src/components/Layout.jsx
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";

export default function Layout({ children }) {
    return (
        <div className="min-h-screen" style={{ backgroundColor: "var(--color-background)" }}>
            {/* Navigation */}
            <header className="bg-white shadow-sm border-b border-rose-100 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <Link
                        to="/"
                        className="flex items-center gap-2 text-xl font-bold hover:opacity-80 transition-opacity"
                        style={{ color: "var(--color-primary)" }}
                    >
                        <Heart className="w-6 h-6 fill-current" />
                        <span className="hidden sm:inline">Honeymoon Hotel Finder</span>
                        <span className="sm:hidden">HHF</span>
                    </Link>
                </div>
            </header>

            {/* Page content */}
            <main>{children}</main>

            {/* Footer */}
            <footer className="border-t border-gray-100 bg-white mt-16">
                <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm"
                     style={{ color: "var(--color-text-muted)" }}>
                    Honeymoon Hotel Finder — Aggregating results from Google, Booking.com,
                    TripAdvisor & Expedia
                </div>
            </footer>
        </div>
    );
}