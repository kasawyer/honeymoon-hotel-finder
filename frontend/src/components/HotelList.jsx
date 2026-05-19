// src/components/HotelList.jsx
import HotelCard from "./HotelCard";
import NoResults from "./NoResults";

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

export default function HotelList({ hotels, loading, location, onSearch, onSelectHotel }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} />
        ))}
      </div>
    );
  }

  if (!hotels || hotels.length === 0) {
    return <NoResults location={location || "this area"} onSearch={onSearch} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {hotels.map((hotel, i) => (
        <HotelCard
          key={`${hotel.source}-${hotel.external_id}-${i}`}
          hotel={hotel}
          onSelect={onSelectHotel}
        />
      ))}
    </div>
  );
}
