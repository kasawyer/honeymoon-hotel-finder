// src/components/ProgressBar.jsx

const STAGE_ICONS = {
  connecting: "🔍",
  tripadvisor: "🌴",
  tripadvisor_done: "✅",
  tripadvisor_fallback: "🔄",
  google_geocode: "📍",
  google_search: "🗺️",
  google_done: "✅",
  enriching: "⭐",
  enriching_done: "✅",
  cache_hit: "⚡",
  done: "🎉",
};

export default function ProgressBar({ progress }) {
  if (!progress) return null;

  const percent = progress.percent || 0;
  const icon = STAGE_ICONS[progress.stage] || "🔍";

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Progress bar track */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percent}%`,
            backgroundColor: "var(--color-primary)",
          }}
        />
      </div>

      {/* Status message */}
      <p className="text-sm text-center" style={{ color: "var(--color-text-light)" }}>
        <span className="mr-1">{icon}</span>
        {progress.message}
      </p>
    </div>
  );
}
