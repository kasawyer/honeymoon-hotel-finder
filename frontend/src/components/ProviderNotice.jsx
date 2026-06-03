// src/components/ProviderNotice.jsx
import { AlertTriangle, X, Info } from "lucide-react";
import { useState } from "react";

export default function ProviderNotice({ providerErrors, degradedProviders }) {
  const [dismissedErrors, setDismissedErrors] = useState(false);
  const [dismissedDegraded, setDismissedDegraded] = useState(false);

  return (
    <>
      {/* Provider errors — APIs that failed */}
      {providerErrors && providerErrors.length > 0 && !dismissedErrors && (
        <div
          className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl mb-4
                        flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm">
              <span className="font-medium">{providerErrors.join(" and ")}</span>
              {providerErrors.length === 1 ? " was" : " were"} unavailable for this search. Results
              are shown from the remaining providers. Ratings may be incomplete for some hotels.
            </p>
          </div>
          <button
            onClick={() => setDismissedErrors(true)}
            className="text-amber-400 hover:text-amber-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Degraded providers — APIs approaching their monthly limit */}
      {degradedProviders && degradedProviders.length > 0 && !dismissedDegraded && (
        <div
          className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl mb-4
                        flex items-start gap-3"
        >
          <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-500" />
          <div className="flex-1">
            <p className="text-sm">
              <span className="font-medium">{degradedProviders.join(" and ")}</span>
              {degradedProviders.length === 1 ? " is" : " are"} approaching the monthly API limit.
              Some results may have fewer ratings than usual.
            </p>
          </div>
          <button
            onClick={() => setDismissedDegraded(true)}
            className="text-blue-400 hover:text-blue-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
