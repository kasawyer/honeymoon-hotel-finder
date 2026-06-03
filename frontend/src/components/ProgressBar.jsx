// src/components/ProgressBar.jsx

export default function ProgressBar({ progress }) {
  if (!progress) return null;

  const percent = progress.percent || 0;

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        className="h-1.5 overflow-hidden mb-3"
        style={{ backgroundColor: "var(--color-border-warm)", borderRadius: "100px" }}
      >
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${percent}%`,
            backgroundColor: "var(--color-primary)",
            borderRadius: "100px",
          }}
        />
      </div>
      <p className="text-xs sm:text-sm text-center" style={{ color: "var(--color-text-muted)" }}>
        {progress.message}
      </p>
    </div>
  );
}
