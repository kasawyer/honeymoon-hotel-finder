// src/components/HotelList.jsx
import HotelCard from "./HotelCard";
import { SearchX } from "lucide-react";

// Skeleton loader while results are fetching
function Skeleton() {
    return (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden animate-pulse">
            <div className="h-48 bg-gray-200" />
            <div className="p-5 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
                <div className="flex justify-between">
                    <div className="h-4 bg-gray-100 rounded w-1/4" />
                    <div className="h-6 bg-gray-200 rounded w-1/5" />
                </div>
            </div>
        </div>
    );
}

export default function HotelList({ hotels, loading }) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} />)}
            </div>
        );
    }

    if (!hotels || hotels.length === 0) {
        return (
            <div className="text-center py-20">
                <SearchX className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                <p className="text-xl font-medium text-gray-400">No hotels found</p>
                <p className="text-sm text-gray-300 mt-2">
                    Try a different location or adjust your keyword filters
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hotels.map((hotel, i) => (
                <HotelCard key={`${hotel.source}-${hotel.external_id}-${i}`} hotel={hotel} />
            ))}
        </div>
    );
}