import {
  STATUS_LABELS,
  NDVI_COLORS,
  ndviToStatus,
  PRESCRIPTION,
} from "../data/fields";

const BREAKDOWN_ROWS = [
  { key: "healthy", label: "Healthy" },
  { key: "mild", label: "Mild stress" },
  { key: "deficient", label: "N-deficient" },
  { key: "severe", label: "Severe stress" },
];

function HealthRing({ score }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const pct = score / 100;
  const color = score >= 80 ? "#15803d" : score >= 60 ? "#65a30d" : score >= 40 ? "#eab308" : "#dc2626";
  return (
    <div style={{ position: "relative", width: 96, height: 96 }}>
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#222" strokeWidth="6" />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={`${c * pct} ${c}`}
          strokeDashoffset={c * 0.25}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
          {score}
        </div>
        <div style={{ fontSize: 10, color: "#666", marginTop: 4, letterSpacing: 0.5 }}>
          / 100
        </div>
      </div>
    </div>
  );
}

export default function FieldOverview({ field, selectedZone, onContinue, onBack }) {
  return (
    <div className="cg-panel">
      <button className="cg-back" onClick={onBack}>← All fields</button>

      <div style={{ marginTop: 16 }}>
        <div className="cg-eyebrow">Field</div>
        <h1 className="cg-title">{field.name}</h1>
        <div className="cg-subtle" style={{ marginTop: 4 }}>
          {field.crop} · Planted {field.plantedDate}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginTop: 28,
          paddingBottom: 24,
          borderBottom: "1px solid #1a1a1a",
        }}
      >
        <HealthRing score={field.healthScore} />
        <div style={{ flex: 1 }}>
          <div className="cg-eyebrow">Total area</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#fff", marginTop: 2 }}>
            {field.acres} <span style={{ fontSize: 14, color: "#888", fontWeight: 500 }}>acres</span>
          </div>
          <div className="cg-subtle" style={{ marginTop: 6 }}>
            Sentinel-2 · 7 May 2026
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div className="cg-eyebrow" style={{ marginBottom: 12 }}>Zone breakdown</div>
        {BREAKDOWN_ROWS.map((row) => {
          const pct = field.breakdown[row.key] ?? 0;
          const color = NDVI_COLORS[row.key] ?? "#666";
          return (
            <div
              key={row.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 0",
                fontSize: 14,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: color,
                  flexShrink: 0,
                }}
              />
              <div style={{ color: "#ccc", flex: 1 }}>{row.label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, width: 140 }}>
                <div
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background: "#1a1a1a",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: color,
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 36,
                    textAlign: "right",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {pct}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedZone && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid #222",
            borderRadius: 10,
            background: "#0d0d0d",
          }}
        >
          <div className="cg-eyebrow">Zone {selectedZone.id}</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 6,
              fontSize: 16,
              fontWeight: 600,
              color: "#fff",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: NDVI_COLORS[ndviToStatus(selectedZone.ndvi)],
              }}
            />
            {STATUS_LABELS[ndviToStatus(selectedZone.ndvi)]}
          </div>
          <div className="cg-subtle" style={{ marginTop: 6 }}>
            NDVI {selectedZone.ndvi.toFixed(2)} ·{" "}
            {PRESCRIPTION[ndviToStatus(selectedZone.ndvi)].action}
          </div>
        </div>
      )}

      <button className="cg-cta" onClick={onContinue} style={{ marginTop: 28 }}>
        Generate fertiliser plan →
      </button>
    </div>
  );
}
