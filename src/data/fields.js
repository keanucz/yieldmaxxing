// NDVI status colors — only chromatic accents allowed in the UI.
export const NDVI_COLORS = {
  healthy: "#15803d",
  good: "#65a30d",
  mild: "#eab308",
  deficient: "#f97316",
  severe: "#dc2626",
};

export const STATUS_LABELS = {
  healthy: "Healthy",
  good: "Good",
  mild: "Mild stress",
  deficient: "N-deficient",
  severe: "Severe stress",
};

export const STATUS_EMOJI = {
  healthy: "🟢",
  good: "🟢",
  mild: "🟡",
  deficient: "🟠",
  severe: "🔴",
};

export function ndviToStatus(v) {
  if (v >= 0.7) return "healthy";
  if (v >= 0.5) return "good";
  if (v >= 0.3) return "mild";
  if (v >= 0.2) return "deficient";
  return "severe";
}

export function ndviToColor(v) {
  return NDVI_COLORS[ndviToStatus(v)];
}

export const PRESCRIPTION = {
  healthy: { rate: 0, label: "Skip", action: "No fertiliser — zone is healthy" },
  good: { rate: 20, label: "20 kg/ha", action: "Maintenance dose of urea" },
  mild: { rate: 40, label: "40 kg/ha", action: "Apply 40 kg/ha urea" },
  deficient: { rate: 60, label: "60 kg/ha", action: "Apply 60 kg/ha urea" },
  severe: { rate: 80, label: "80 kg/ha", action: "Apply 80 kg/ha urea + foliar spray" },
};

export const UREA_PRICE_PER_KG = 0.68;
export const BLANKET_RATE_KG_PER_HA = 60;
export const ACRES_PER_HA = 2.47105;
export const YIELD_GAIN_PER_ACRE = 24;

// 3 corn fields near Lincoln, Nebraska (40.85, -96.76)
export const FIELDS = [
  {
    id: "north",
    name: "North Field",
    crop: "Corn (Zea mays)",
    plantedDate: "April 2026",
    acres: 142,
    healthScore: 72,
    center: [40.852, -96.7615],
    polygon: [
      [40.8555, -96.7665],
      [40.8555, -96.7565],
      [40.8488, -96.7560],
      [40.8485, -96.7665],
    ],
    breakdown: { healthy: 58, mild: 22, deficient: 14, severe: 6 },
    zones: [
      { id: 1, ndvi: 0.82, polygon: [[40.8555, -96.7665], [40.8555, -96.7632], [40.852, -96.7632], [40.852, -96.7665]] },
      { id: 2, ndvi: 0.55, polygon: [[40.8555, -96.7632], [40.8555, -96.7598], [40.852, -96.7598], [40.852, -96.7632]] },
      { id: 3, ndvi: 0.74, polygon: [[40.8555, -96.7598], [40.8555, -96.7565], [40.852, -96.7565], [40.852, -96.7598]] },
      { id: 4, ndvi: 0.42, polygon: [[40.852, -96.7665], [40.852, -96.7632], [40.8485, -96.7632], [40.8485, -96.7665]] },
      { id: 5, ndvi: 0.18, polygon: [[40.852, -96.7632], [40.852, -96.7598], [40.8485, -96.7598], [40.8485, -96.7632]] },
      { id: 6, ndvi: 0.28, polygon: [[40.852, -96.7598], [40.852, -96.7565], [40.8485, -96.7565], [40.8485, -96.7598]] },
    ],
    // Hardcoded to match the demo briefing exactly.
    savings: {
      blanketKg: 8520,
      precisionKg: 5164,
      blanketCost: 5794,
      precisionCost: 3512,
      saved: 2282,
      yieldGain: 3400,
      netBenefit: 5682,
      reductionPct: 39,
      yieldUpliftPct: "+8-12%",
    },
  },
  {
    id: "south",
    name: "South Field",
    crop: "Corn (Zea mays)",
    plantedDate: "April 2026",
    acres: 287,
    healthScore: 84,
    center: [40.8425, -96.761],
    polygon: [
      [40.8455, -96.766],
      [40.8455, -96.756],
      [40.8395, -96.7565],
      [40.8395, -96.766],
    ],
    breakdown: { healthy: 76, mild: 14, deficient: 8, severe: 2 },
    zones: [
      { id: 1, ndvi: 0.85, polygon: [[40.8455, -96.766], [40.8455, -96.761], [40.8425, -96.761], [40.8425, -96.766]] },
      { id: 2, ndvi: 0.78, polygon: [[40.8455, -96.761], [40.8455, -96.756], [40.8425, -96.756], [40.8425, -96.761]] },
      { id: 3, ndvi: 0.62, polygon: [[40.8425, -96.766], [40.8425, -96.761], [40.8395, -96.761], [40.8395, -96.766]] },
      { id: 4, ndvi: 0.38, polygon: [[40.8425, -96.761], [40.8425, -96.756], [40.8395, -96.756], [40.8395, -96.761]] },
    ],
    savings: {
      blanketKg: 17220,
      precisionKg: 9460,
      blanketCost: 11710,
      precisionCost: 6433,
      saved: 5277,
      yieldGain: 6888,
      netBenefit: 12165,
      reductionPct: 45,
      yieldUpliftPct: "+10-14%",
    },
  },
  {
    id: "east",
    name: "East Field",
    crop: "Corn (Zea mays)",
    plantedDate: "April 2026",
    acres: 418,
    healthScore: 65,
    center: [40.8485, -96.748],
    polygon: [
      [40.852, -96.753],
      [40.852, -96.743],
      [40.8455, -96.7435],
      [40.8455, -96.753],
    ],
    breakdown: { healthy: 48, mild: 28, deficient: 18, severe: 6 },
    zones: [
      { id: 1, ndvi: 0.78, polygon: [[40.852, -96.753], [40.852, -96.7497], [40.8488, -96.7497], [40.8488, -96.753]] },
      { id: 2, ndvi: 0.45, polygon: [[40.852, -96.7497], [40.852, -96.7463], [40.8488, -96.7463], [40.8488, -96.7497]] },
      { id: 3, ndvi: 0.32, polygon: [[40.852, -96.7463], [40.852, -96.743], [40.8488, -96.743], [40.8488, -96.7463]] },
      { id: 4, ndvi: 0.71, polygon: [[40.8488, -96.753], [40.8488, -96.7497], [40.8455, -96.7497], [40.8455, -96.753]] },
      { id: 5, ndvi: 0.55, polygon: [[40.8488, -96.7497], [40.8488, -96.7463], [40.8455, -96.7463], [40.8455, -96.7497]] },
      { id: 6, ndvi: 0.22, polygon: [[40.8488, -96.7463], [40.8488, -96.743], [40.8455, -96.743], [40.8455, -96.7463]] },
    ],
    savings: {
      blanketKg: 25080,
      precisionKg: 16554,
      blanketCost: 17054,
      precisionCost: 11257,
      saved: 5797,
      yieldGain: 10032,
      netBenefit: 15829,
      reductionPct: 34,
      yieldUpliftPct: "+7-10%",
    },
  },
];

export const TOTAL_ACRES = FIELDS.reduce((s, f) => s + f.acres, 0);
export const FIELD_COUNT = FIELDS.length;
export const HOME_CENTER = [40.8475, -96.756];
export const HOME_ZOOM = 14;
export const FIELD_ZOOM = 16;
