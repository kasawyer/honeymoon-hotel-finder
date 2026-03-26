// src/components/KeywordFilter.jsx

const KEYWORD_OPTIONS = [
    { label: "Romantic", value: "romantic", emoji: "💕" },
    { label: "Honeymoon", value: "honeymoon", emoji: "🌙" },
    { label: "Anniversary", value: "anniversary", emoji: "🥂" },
    { label: "Couples Suite", value: "couples suite", emoji: "🛏️" },
    { label: "Luxury", value: "luxury", emoji: "✨" },
    { label: "Spa", value: "spa", emoji: "🧖" },
    { label: "Beachfront", value: "beachfront", emoji: "🏖️" },
    { label: "Adults Only", value: "adults only", emoji: "🔒" },
];

export default function KeywordFilter({ selected = [], onChange }) {
    const toggle = (value) => {
        if (selected.includes(value)) {
            onChange(selected.filter((v) => v !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    return (
        <div className="flex flex-wrap gap-2 justify-center">
            {KEYWORD_OPTIONS.map((kw) => {
                const active = selected.includes(kw.value);
                return (
                    <button
                        key={kw.value}
                        type="button"
                        onClick={() => toggle(kw.value)}
                        className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${active
                            ? "text-white shadow-md scale-105"
                            : "bg-white text-gray-600 border border-gray-200 hover:border-rose-300 hover:text-rose-700"
                        }
            `}
                        style={active ? { backgroundColor: "var(--color-primary)" } : {}}
                    >
                        {kw.emoji} {kw.label}
                    </button>
                );
            })}
        </div>
    );
}