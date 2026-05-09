import { useState, useRef } from "react";

const MOCK_DIAGNOSIS = {
  status: "nitrogen_deficiency",
  confidence: 0.89,
  severity: 3,
  label: "Nitrogen Deficiency",
  emoji: "🟡",
  description: "Yellowing of lower leaves indicates nitrogen deficiency. The plant is redirecting limited nitrogen to newer growth.",
  action: "Apply 40kg/ha urea to this zone. Skip healthy zones to save fertiliser.",
  fertiliser_needed: true,
  savings_pct: 32,
};

const FIELD_ZONES = [
  { id: 1, x: 10, y: 10, w: 28, h: 35, ndvi: 0.82, status: "healthy", color: "#22c55e" },
  { id: 2, x: 42, y: 10, w: 28, h: 35, ndvi: 0.41, status: "nitrogen_deficiency", color: "#eab308" },
  { id: 3, x: 74, y: 10, w: 22, h: 35, ndvi: 0.73, status: "healthy", color: "#22c55e" },
  { id: 4, x: 10, y: 50, w: 22, h: 40, ndvi: 0.68, status: "mild_stress", color: "#84cc16" },
  { id: 5, x: 36, y: 50, w: 30, h: 40, ndvi: 0.29, status: "severe_deficiency", color: "#ef4444" },
  { id: 6, x: 70, y: 50, w: 26, h: 40, ndvi: 0.77, status: "healthy", color: "#22c55e" },
];

const STATUS_LABELS = {
  healthy: { label: "Healthy", emoji: "🟢", action: "No fertiliser needed — skip this zone" },
  mild_stress: { label: "Mild Stress", emoji: "🟡", action: "Monitor — recheck in 5 days" },
  nitrogen_deficiency: { label: "N-Deficiency", emoji: "🟠", action: "Apply 40kg/ha urea" },
  severe_deficiency: { label: "Severe Deficiency", emoji: "🔴", action: "Apply 60kg/ha urea + foliar spray" },
};

const FERTILISER_PRICE_PER_KG = 0.68;

export default function App() {
  const [view, setView] = useState("home");
  const [image, setImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [fieldSize, setFieldSize] = useState(50);
  const fileRef = useRef();

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImage(url);
    setAnalyzing(true);
    setView("diagnosis");
    setTimeout(() => {
      setDiagnosis(MOCK_DIAGNOSIS);
      setAnalyzing(false);
    }, 2500);
  };

  const totalArea = FIELD_ZONES.reduce((s, z) => s + (z.w * z.h) / 100, 0);
  const fertZones = FIELD_ZONES.filter(z => z.status !== "healthy");
  const fertArea = fertZones.reduce((s, z) => s + (z.w * z.h) / 100, 0);
  const skipArea = totalArea - fertArea;
  const savingsRatio = skipArea / totalArea;
  const traditionalCost = fieldSize * 150 * FERTILISER_PRICE_PER_KG;
  const optimizedCost = traditionalCost * (1 - savingsRatio);
  const savings = traditionalCost - optimizedCost;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(145deg, #0a0f0a 0%, #1a2e1a 50%, #0d1f0d 100%)",
      color: "#e8f5e8",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      maxWidth: 480,
      margin: "0 auto",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.04,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      {view === "home" && (
        <div style={{ padding: "60px 24px 40px", textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>🌾</div>
          <h1 style={{
            fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em",
            background: "linear-gradient(135deg, #4ade80, #22c55e, #15803d)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            margin: "0 0 8px",
          }}>CropGuard</h1>
          <p style={{ fontSize: 15, color: "#9ca38c", margin: "0 0 32px", lineHeight: 1.5 }}>
            AI-powered precision fertiliser advisor.<br />
            Save up to 30% on fertiliser. Boost your yield.
          </p>

          <div style={{
            background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)",
            borderRadius: 12, padding: "16px 20px", textAlign: "left", marginBottom: 32,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#eab308", marginBottom: 6 }}>
              ⚠️ HORMUZ CRISIS — FERTILISER ALERT
            </div>
            <div style={{ fontSize: 13, color: "#bbb", lineHeight: 1.5 }}>
              Urea prices hit <strong style={{ color: "#eab308" }}>$680/ton</strong> — up 43% since the Strait of Hormuz closure. Every kilo you waste costs more than ever.
            </div>
          </div>

          <button onClick={() => fileRef.current?.click()} style={{
            width: "100%", padding: "18px 24px", fontSize: 17, fontWeight: 700,
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            color: "#fff", border: "none", borderRadius: 14, cursor: "pointer",
            boxShadow: "0 4px 24px rgba(34,197,94,0.3)", marginBottom: 14,
          }}>📸 Scan a Plant</button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePhoto} />
          <p style={{ fontSize: 12, color: "#666", marginBottom: 28 }}>
            Take a photo of any leaf or crop — get an instant diagnosis
          </p>

          <button onClick={() => setView("field")} style={{
            width: "100%", padding: "16px 24px", fontSize: 16, fontWeight: 600,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
            color: "#a3e635", borderRadius: 14, cursor: "pointer",
          }}>🗺️ View Prescription Map</button>

          <div style={{
            marginTop: 40, padding: "20px", borderRadius: 12,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#9ca38c", marginBottom: 12 }}>HOW IT WORKS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["📸", "Photograph your crop"], ["🧠", "AI identifies stress & disease"], ["🗺️", "Get a zone-by-zone fertiliser plan"], ["💰", "Save up to 30% on inputs"]].map(([icon, text], i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "#ccc" }}>
                  <span style={{ fontSize: 20, width: 32, textAlign: "center" }}>{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === "diagnosis" && (
        <div style={{ padding: "20px 24px 40px" }}>
          <button onClick={() => { setView("home"); setImage(null); setDiagnosis(null); }}
            style={{ background: "none", border: "none", color: "#9ca38c", fontSize: 14, cursor: "pointer", marginBottom: 16, padding: 0 }}>← Back</button>
          {image && (
            <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 20, border: "1px solid rgba(255,255,255,0.1)" }}>
              <img src={image} alt="Crop" style={{ width: "100%", height: 240, objectFit: "cover" }} />
            </div>
          )}
          {analyzing ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{
                width: 48, height: 48, border: "3px solid rgba(34,197,94,0.2)",
                borderTopColor: "#22c55e", borderRadius: "50%",
                animation: "spin 1s linear infinite", margin: "0 auto 16px",
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              <p style={{ color: "#9ca38c", fontSize: 15 }}>Analyzing crop health...</p>
            </div>
          ) : diagnosis && (
            <>
              <div style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16, padding: "24px", marginBottom: 16,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <span style={{ fontSize: 36 }}>{diagnosis.emoji}</span>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{diagnosis.label}</div>
                    <div style={{ fontSize: 13, color: "#9ca38c" }}>
                      Confidence: {Math.round(diagnosis.confidence * 100)}% · Severity: {diagnosis.severity}/5
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: "#ccc", lineHeight: 1.6, margin: "0 0 16px" }}>{diagnosis.description}</p>
                <div style={{
                  background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
                  borderRadius: 10, padding: "14px 16px",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#4ade80", marginBottom: 4 }}>✅ RECOMMENDED ACTION</div>
                  <div style={{ fontSize: 14, color: "#e8f5e8" }}>{diagnosis.action}</div>
                </div>
              </div>
              <div style={{
                background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.15)",
                borderRadius: 16, padding: "20px 24px", textAlign: "center",
              }}>
                <div style={{ fontSize: 13, color: "#eab308", fontWeight: 600, marginBottom: 8 }}>POTENTIAL FERTILISER SAVINGS</div>
                <div style={{ fontSize: 42, fontWeight: 800, color: "#4ade80" }}>{diagnosis.savings_pct}%</div>
                <div style={{ fontSize: 13, color: "#9ca38c" }}>by applying only where needed</div>
              </div>
              <button onClick={() => setView("field")} style={{
                width: "100%", marginTop: 20, padding: "16px", fontSize: 16, fontWeight: 600,
                background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff",
                border: "none", borderRadius: 14, cursor: "pointer",
              }}>🗺️ See Full Field Map</button>
            </>
          )}
        </div>
      )}

      {view === "field" && (
        <div style={{ padding: "20px 24px 40px" }}>
          <button onClick={() => setView("home")}
            style={{ background: "none", border: "none", color: "#9ca38c", fontSize: 14, cursor: "pointer", marginBottom: 16, padding: 0 }}>← Back</button>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Field Prescription Map</h2>
          <p style={{ fontSize: 13, color: "#9ca38c", margin: "0 0 20px" }}>
            Based on Sentinel-2 NDVI satellite data · Updated 7 May 2026
          </p>
          <div style={{
            position: "relative", width: "100%", paddingBottom: "70%",
            background: "rgba(0,0,0,0.3)", borderRadius: 16, overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.1)", marginBottom: 20,
          }}>
            <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              {FIELD_ZONES.map((zone) => (
                <g key={zone.id} onClick={() => setSelectedZone(zone)} style={{ cursor: "pointer" }}>
                  <rect x={zone.x} y={zone.y} width={zone.w} height={zone.h}
                    fill={zone.color} opacity={selectedZone?.id === zone.id ? 0.8 : 0.45}
                    rx={2} stroke={selectedZone?.id === zone.id ? "#fff" : "rgba(255,255,255,0.15)"}
                    strokeWidth={selectedZone?.id === zone.id ? 1.5 : 0.5} />
                  <text x={zone.x + zone.w / 2} y={zone.y + zone.h / 2 - 3}
                    textAnchor="middle" fill="#fff" fontSize={5} fontWeight="bold">
                    {STATUS_LABELS[zone.status]?.emoji}
                  </text>
                  <text x={zone.x + zone.w / 2} y={zone.y + zone.h / 2 + 5}
                    textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={3.2}>
                    NDVI {zone.ndvi.toFixed(2)}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            {[["#22c55e", "Healthy — skip"], ["#84cc16", "Mild stress"], ["#eab308", "N-deficient"], ["#ef4444", "Severe — urgent"]].map(([color, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#aaa" }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
                {label}
              </div>
            ))}
          </div>
          {selectedZone && (
            <div style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 14, padding: "16px 20px", marginBottom: 20,
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                {STATUS_LABELS[selectedZone.status]?.emoji} Zone {selectedZone.id}: {STATUS_LABELS[selectedZone.status]?.label}
              </div>
              <div style={{ fontSize: 13, color: "#9ca38c", marginBottom: 8 }}>
                NDVI: {selectedZone.ndvi.toFixed(2)} · Area: {((selectedZone.w * selectedZone.h / 100) * fieldSize / totalArea).toFixed(1)} ha
              </div>
              <div style={{
                fontSize: 14, color: "#e8f5e8", background: "rgba(34,197,94,0.08)",
                padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(34,197,94,0.15)",
              }}>→ {STATUS_LABELS[selectedZone.status]?.action}</div>
            </div>
          )}
          <div style={{
            background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(234,179,8,0.06))",
            border: "1px solid rgba(34,197,94,0.15)", borderRadius: 16, padding: "24px",
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#4ade80", marginBottom: 16 }}>💰 SAVINGS CALCULATOR</div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "#9ca38c", display: "block", marginBottom: 6 }}>
                Your field size: {fieldSize} hectares
              </label>
              <input type="range" min={5} max={200} value={fieldSize}
                onChange={(e) => setFieldSize(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#22c55e" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{
                background: "rgba(239,68,68,0.08)", borderRadius: 10, padding: "14px",
                border: "1px solid rgba(239,68,68,0.15)",
              }}>
                <div style={{ fontSize: 11, color: "#fca5a5", fontWeight: 600 }}>WITHOUT CROPGUARD</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#fca5a5", marginTop: 4 }}>
                  ${Math.round(traditionalCost).toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: "#888" }}>Blanket application</div>
              </div>
              <div style={{
                background: "rgba(34,197,94,0.08)", borderRadius: 10, padding: "14px",
                border: "1px solid rgba(34,197,94,0.15)",
              }}>
                <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 600 }}>WITH CROPGUARD</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#86efac", marginTop: 4 }}>
                  ${Math.round(optimizedCost).toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: "#888" }}>Precision application</div>
              </div>
            </div>
            <div style={{
              textAlign: "center", marginTop: 16, padding: "14px",
              background: "rgba(34,197,94,0.12)", borderRadius: 10,
            }}>
              <div style={{ fontSize: 13, color: "#9ca38c" }}>You save</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#4ade80" }}>
                ${Math.round(savings).toLocaleString()}
              </div>
              <div style={{ fontSize: 13, color: "#9ca38c" }}>
                per season · {Math.round(savingsRatio * 100)}% less fertiliser · same or better yield
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
