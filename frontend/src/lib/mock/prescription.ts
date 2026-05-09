import type {
  FertilizerProduct,
  Field,
  Prescription,
  PrescriptionZoneFeature,
} from "../../types";
import { ringAreaHa } from "../geo";
import { GRID_SIZE, type NDVIGridCapture } from "./ndvi";

// USD/ton wholesale, May 2026 — Hormuz crisis premium on urea has dragged the
// whole N complex up. Used for the cost preview on the prescription page.
export const FERTILIZER_PRICE_USD_PER_TON: Record<FertilizerProduct, number> = {
  "Urea (46-0-0)": 680,
  "CAN 27%N": 430,
  "NPK 20-10-10": 560,
  "UAN 28%": 395,
};

// What a non-precision farmer blanket-applies across the whole field "to be
// safe" — matches the heavy zone in our 3-tier rule so the comparison is honest.
export const UNIFORM_BLANKET_RATE_KG_HA = 140;

export interface CostPreview {
  product: FertilizerProduct;
  pricePerTon: number;
  variableKg: number;
  variableCostUsd: number;
  uniformKg: number;
  uniformCostUsd: number;
  savingUsd: number;
  savingPct: number;
  uniformRateKgHa: number;
}

export function computeCostPreview(
  field: Field,
  prescription: Prescription,
): CostPreview {
  const pricePerTon = FERTILIZER_PRICE_USD_PER_TON[prescription.product];
  const uniformKg = field.areaHa * UNIFORM_BLANKET_RATE_KG_HA;
  const variableKg = prescription.totalKg;
  const variableCostUsd = (variableKg / 1000) * pricePerTon;
  const uniformCostUsd = (uniformKg / 1000) * pricePerTon;
  const savingUsd = uniformCostUsd - variableCostUsd;
  const savingPct = uniformCostUsd > 0 ? savingUsd / uniformCostUsd : 0;
  return {
    product: prescription.product,
    pricePerTon,
    variableKg: Math.round(variableKg),
    variableCostUsd: Math.round(variableCostUsd),
    uniformKg: Math.round(uniformKg),
    uniformCostUsd: Math.round(uniformCostUsd),
    savingUsd: Math.round(savingUsd),
    savingPct,
    uniformRateKgHa: UNIFORM_BLANKET_RATE_KG_HA,
  };
}

// Pick the peak-summer capture (highest mean NDVI) for the prescription basis.
export function peakSummerCapture(history: NDVIGridCapture[]): NDVIGridCapture {
  let best = history[0];
  for (const c of history) if (c.ndviStats.mean > best.ndviStats.mean) best = c;
  return best;
}

// Build a 3-tier (skip / low / high) prescription map over a 4×4 grid covering
// the field bbox, derived from the peak-summer NDVI mean per cell.
export function buildPrescription(
  field: Field,
  history: NDVIGridCapture[],
  product: FertilizerProduct,
): Prescription {
  const peak = peakSummerCapture(history);
  const [west, south, east, north] = field.bbox;
  const NX = 4;
  const NY = 4;
  const cellW = GRID_SIZE / NX;
  const cellH = GRID_SIZE / NY;

  let totalKg = 0;
  let treatedHa = 0;
  let skippedHa = 0;
  const features: PrescriptionZoneFeature[] = [];
  let zoneId = 1;

  for (let cy = 0; cy < NY; cy++) {
    for (let cx = 0; cx < NX; cx++) {
      let sum = 0;
      let n = 0;
      for (
        let py = Math.floor(cy * cellH);
        py < Math.floor((cy + 1) * cellH);
        py++
      ) {
        for (
          let px = Math.floor(cx * cellW);
          px < Math.floor((cx + 1) * cellW);
          px++
        ) {
          sum += peak.grid[py * GRID_SIZE + px];
          n++;
        }
      }
      const mean = sum / n;
      // 3-tier rule. Tuned so a healthy peak field still shows visible
      // variation: high-NDVI = healthy, doesn't need N; low-NDVI = struggling,
      // gets the heavy dose.
      let rate = 0;
      let band: "skip" | "low" | "high" = "skip";
      if (mean > 0.78) {
        rate = 0;
        band = "skip";
      } else if (mean >= 0.65) {
        rate = 80;
        band = "low";
      } else {
        rate = 140;
        band = "high";
      }

      const w0 = west + (cx / NX) * (east - west);
      const w1 = west + ((cx + 1) / NX) * (east - west);
      const yT = north - (cy / NY) * (north - south);
      const yB = north - ((cy + 1) / NY) * (north - south);
      const ring: number[][] = [
        [w0, yB],
        [w1, yB],
        [w1, yT],
        [w0, yT],
        [w0, yB],
      ];
      const cellHa = ringAreaHa(ring);
      const cellKg = cellHa * rate;
      totalKg += cellKg;
      if (rate > 0) treatedHa += cellHa;
      else skippedHa += cellHa;

      features.push({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [ring] },
        properties: {
          zone_id: zoneId++,
          rate_kg_ha: rate,
          band,
        },
      });
    }
  }

  return {
    fieldId: field.id,
    product,
    generatedAt: new Date().toISOString(),
    zones: { type: "FeatureCollection", features },
    totalKg: Math.round(totalKg),
    treatedHa: round1(treatedHa),
    skippedHa: round1(skippedHa),
  };
}

export function rateBandColor(band: "skip" | "low" | "high"): string {
  return band === "skip" ? "#3f3f46" : band === "low" ? "#84cc16" : "#15803d";
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
