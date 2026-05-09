function MetricCard({ icon, value, label, accent = "#fff" }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 200,
        padding: "28px 24px",
        background: "#0d0d0d",
        border: "1px solid #1f1f1f",
        borderRadius: 14,
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 10 }}>{icon}</div>
      <div
        style={{
          fontSize: 36,
          fontWeight: 800,
          color: accent,
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 13, color: "#888", marginTop: 8 }}>{label}</div>
    </div>
  );
}

export default function ROISummary({ field, onBack }) {
  const s = field.savings;
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 920 }}>
        <button className="cg-back" onClick={onBack}>← Back to field</button>

        <div style={{ marginTop: 24 }}>
          <div className="cg-eyebrow">Season summary</div>
          <h1
            style={{
              fontSize: 44,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-0.03em",
              margin: "8px 0 8px",
              lineHeight: 1.05,
            }}
          >
            Your {field.name} pays for itself.
          </h1>
          <div style={{ fontSize: 16, color: "#888", maxWidth: 540 }}>
            With CropGuard's precision plan, here's what {field.acres} acres of corn
            looks like this season.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 36,
            flexWrap: "wrap",
          }}
        >
          <MetricCard
            icon="💰"
            value={`$${s.saved.toLocaleString()}`}
            label="saved on fertiliser costs"
            accent="#22c55e"
          />
          <MetricCard
            icon="📈"
            value={`+$${s.yieldGain.toLocaleString()}`}
            label="additional revenue from yield gain"
            accent="#22c55e"
          />
          <MetricCard
            icon="🌍"
            value={`${(s.blanketKg - s.precisionKg).toLocaleString()} kg`}
            label="less fertiliser in the environment"
          />
        </div>

        <div
          style={{
            marginTop: 28,
            padding: "32px 32px",
            background:
              "linear-gradient(180deg, #0d1a12 0%, #0a0a0a 100%)",
            border: "1px solid #1f3a2a",
            borderRadius: 16,
          }}
        >
          <div className="cg-eyebrow" style={{ color: "#86efac" }}>
            Net benefit
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "#22c55e",
              letterSpacing: "-0.04em",
              lineHeight: 1,
              marginTop: 8,
            }}
          >
            ${s.netBenefit.toLocaleString()}
          </div>
          <div style={{ fontSize: 14, color: "#888", marginTop: 8 }}>
            per season — fertiliser cost reduction plus expected yield uplift
          </div>
        </div>

        <div
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid #1f1f1f",
            borderRadius: 10,
            background: "#0a0a0a",
            fontSize: 12,
            color: "#777",
            lineHeight: 1.6,
          }}
        >
          Fertiliser costs based on current urea spot price of{" "}
          <span style={{ color: "#fff" }}>$680/ton</span> (post-Hormuz crisis,
          up 43% since closure). Powered by Sentinel-2 satellite data · updated every 5 days.
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button className="cg-secondary" onClick={onBack} style={{ flex: 1 }}>
            ← Back to field
          </button>
          <button className="cg-cta" style={{ flex: 1, marginTop: 0 }}>
            Share report
          </button>
        </div>
      </div>
    </div>
  );
}
