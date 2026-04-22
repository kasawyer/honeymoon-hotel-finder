// src/components/Pagination.jsx
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ currentPage, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;

    // Build page numbers to show
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            // Always show first page
            pages.push(1);

            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);

            // Adjust if near the beginning
            if (currentPage <= 3) {
                end = Math.min(4, totalPages - 1);
            }
            // Adjust if near the end
            if (currentPage >= totalPages - 2) {
                start = Math.max(2, totalPages - 3);
            }

            if (start > 2) pages.push("...");

            for (let i = start; i <= end; i++) pages.push(i);

            if (end < totalPages - 1) pages.push("...");

            // Always show last page
            pages.push(totalPages);
        }

        return pages;
    };

    return (
        <div className="flex items-center justify-center gap-1 mt-8">
            {/* Previous */}
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg transition-colors ${
                    currentPage === 1
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-600 hover:bg-gray-100"
                }`}
                aria-label="Previous page"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Page numbers */}
            {getPageNumbers().map((page, i) =>
                    page === "..." ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-gray-400">
            ...
          </span>
                    ) : (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={`min-w-[40px] h-10 rounded-lg text-sm font-medium transition-colors ${
                                page === currentPage
                                    ? "text-white shadow-sm"
                                    : "text-gray-600 hover:bg-gray-100"
                            }`}
                            style={page === currentPage ? { backgroundColor: "var(--color-primary)" } : {}}
                            aria-label={`Page ${page}`}
                            aria-current={page === currentPage ? "page" : undefined}
                        >
                            {page}
                        </button>
                    )
            )}

            {/* Next */}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg transition-colors ${
                    currentPage === totalPages
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-600 hover:bg-gray-100"
                }`}
                aria-label="Next page"
            >
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
    );
}