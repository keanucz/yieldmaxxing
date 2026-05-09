import type {
  FertilizerProduct,
  Field,
  Prescription,
  PrescriptionZoneFeature,
} from "../../types";
import { ringAreaHa } from "../geo";
import { GRID_SIZE, type NDVIGridCapture } from "./ndvi";

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
