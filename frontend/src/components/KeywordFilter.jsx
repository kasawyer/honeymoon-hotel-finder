// src/components/KeywordFilter.jsx
const KEYWORDS = [
  { value: "romantic", label: "Romantic" },
  { value: "honeymoon", label: "Honeymoon" },
  { value: "anniversary", label: "Anniversary" },
  { value: "couples suite", label: "Couples Suite" },
  { value: "luxury", label: "Luxury" },
  { value: "spa", label: "Spa" },
  { value: "beachfront", label: "Beachfront" },
];

export default function KeywordFilter({ selected, onChange }) {
  const toggle = (keyword) => {
    if (selected.includes(keyword)) {
      onChange(selected.filter((k) => k !== keyword));
    } else {
      onChange([...selected, keyword]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {KEYWORDS.map((kw) => {
        const isSelected = selected.includes(kw.value);
        return (
          <button
            key={kw.value}
            type="button"
            onClick={() => toggle(kw.value)}
            className="px-4 py-2 text-sm font-medium transition-all duration-200"
            style={{
              borderRadius: "8px",
              backgroundColor: isSelected ? "var(--color-primary)" : "white",
              color: isSelected ? "white" : "var(--color-text-light)",
              border: isSelected
                ? "1px solid var(--color-primary)"
                : "1px solid var(--color-border-warm)",
              cursor: "pointer",
            }}
          >
            {kw.label}
          </button>
        );
      })}
    </div>
  );
}
