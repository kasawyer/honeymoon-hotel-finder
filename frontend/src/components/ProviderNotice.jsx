// src/components/ProviderNotice.jsx
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

const PROVIDER_NAMES = {
  TripAdvisor: { color: "#00AF87" },
  Google: { color: "#4285F4" },
  "Booking.com": { color: "#003580" },
};

export default function ProviderNotice({ providerErrors }) {
  const [dismissed, setDismissed] = useState(false);

  if (!providerErrors || providerErrors.length === 0 || dismissed) return null;

  const providers = providerErrors.join(" and ");

  return (
    <div
      className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl mb-4
                    flex items-start gap-3"
    >
      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
      <div className="flex-1">
        <p className="text-sm">
          <span className="font-medium">{providers}</span>
          {providerErrors.length === 1 ? " was" : " were"} unavailable for this search. Results are
          shown from the remaining providers. Ratings may be incomplete for some hotels.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-400 hover:text-amber-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
