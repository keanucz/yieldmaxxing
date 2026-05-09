import { NDVI_COLORS, ndviToStatus, PRESCRIPTION } from "../data/fields";

const LEGEND = [
  { key: "healthy", label: "0 kg/ha — Skip" },
  { key: "good", label: "20 kg/ha urea" },
  { key: "mild", label: "40 kg/ha urea" },
  { key: "deficient", label: "60 kg/ha urea" },
  { key: "severe", label: "80 kg/ha + foliar" },
];

function MoneyMetric({ label, value, tone = "default" }) {
  const colors = {
    default: { fg: "#fff", bg: "#0d0d0d", border: "#222" },
    bad: { fg: "#fca5a5", bg: "#1a0f0f", border: "#3a1f1f" },
    good: { fg: "#86efac", bg: "#0d1a12", border: "#1f3a2a" },
  }[tone];
  return (
    <div
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        padding: 14,
        flex: 1,
      }}
    >
      <div style={{ fontSize: 10, color: "#888", letterSpacing: 0.6, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: colors.fg, marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}

export default function PrescriptionPanel({
  field,
  selectedZone,
  onContinue,
  onBack,
}) {
  const s = field.savings;

  return (
    <div className="cg-panel">
      <button className="cg-back" onClick={onBack}>← Field overview</button>

      <div style={{ marginTop: 16 }}>
        <div className="cg-eyebrow">Prescription</div>
        <h1 className="cg-title">Fertiliser plan</h1>
        <div className="cg-subtle" style={{ marginTop: 4 }}>
          {field.name} · {field.acres} acres · zone-by-zone urea rate
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div className="cg-eyebrow" style={{ marginBottom: 10 }}>Legend</div>
        {LEGEND.map((row) => (
          <div
            key={row.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 0",
              fontSize: 13,
              color: "#bbb",
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                background: NDVI_COLORS[row.key],
              }}
            />
            {row.label}
          </div>
        ))}
      </div>

      {selectedZone && (
        <div
          style={{
            marginTop: 20,
            padding: 14,
            border: "1px solid #222",
            borderRadius: 10,
            background: "#0d0d0d",
          }}
        >
          <div className="cg-eyebrow">Zone {selectedZone.id}</div>
          <div style={{ fontSize: 16, color: "#fff", fontWeight: 600, marginTop: 6 }}>
            {PRESCRIPTION[ndviToStatus(selectedZone.ndvi)].label}
          </div>
          <div className="cg-subtle" style={{ marginTop: 4 }}>
            {PRESCRIPTION[ndviToStatus(selectedZone.ndvi)].action}
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 28,
          padding: 18,
          border: "1px solid #222",
          borderRadius: 12,
          background: "#0a0a0a",
        }}
      >
        <div className="cg-eyebrow">Precision plan vs blanket</div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <MoneyMetric
            label="Blanket"
            value={`$${s.blanketCost.toLocaleString()}`}
            tone="bad"
          />
          <MoneyMetric
            label="With CropGuard"
            value={`$${s.precisionCost.toLocaleString()}`}
            tone="good"
          />
        </div>

        <div className="cg-subtle" style={{ marginTop: 10, fontSize: 12 }}>
          {s.blanketKg.toLocaleString()} kg → {s.precisionKg.toLocaleString()} kg
          urea ({s.reductionPct}% less)
        </div>

        <div
          style={{
            marginTop: 16,
            padding: "14px 16px",
            background: "#0d1a12",
            border: "1px solid #1f3a2a",
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 11, color: "#86efac", letterSpacing: 0.6, textTransform: "uppercase" }}>
            You save
          </div>
          <div style={{ fontSize: 38, fontWeight: 800, color: "#22c55e", lineHeight: 1.1, marginTop: 4 }}>
            ${s.saved.toLocaleString()}
          </div>
          <div className="cg-subtle" style={{ marginTop: 4 }}>
            this season — same or better yield
          </div>
        </div>

        <div className="cg-subtle" style={{ marginTop: 14, fontSize: 12 }}>
          Expected yield impact: {s.yieldUpliftPct} from targeted nutrition.
          <br />
          Revenue gain at $4.20/bushel: <span style={{ color: "#86efac" }}>+${s.yieldGain.toLocaleString()}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <button className="cg-secondary" style={{ flex: 1 }}>
          Export ISOBUS TASKDATA
        </button>
        <button className="cg-secondary" style={{ flex: 1 }}>
          Download PDF
        </button>
      </div>

      <button className="cg-cta" onClick={onContinue} style={{ marginTop: 12 }}>
        See season ROI →
      </button>
    </div>
  );
}
