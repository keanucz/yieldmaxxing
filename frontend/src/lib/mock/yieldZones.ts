import type { YieldZoneFeature } from "../../types";
import { GRID_SIZE, type NDVIGridCapture } from "./ndvi";

// Build 4×4 yield zones over a field's bbox by averaging all NDVI captures
// per cell, then quantile-banding into low/mid/high.
export function buildYieldZones(
  bbox: [number, number, number, number],
  history: NDVIGridCapture[],
): YieldZoneFeature[] {
  const [west, south, east, north] = bbox;
  const NX = 4;
  const NY = 4;
  const cellW = GRID_SIZE / NX;
  const cellH = GRID_SIZE / NY;

  // Average NDVI per cell across all captures (weight summer captures more)
  const cellMeans = new Array(NX * NY).fill(0);
  let totalWeight = 0;
  for (const cap of history) {
    const month = new Date(cap.capturedAt).getUTCMonth();
    const w = month >= 4 && month <= 8 ? 2 : 0.5;
    totalWeight += w;
    for (let cy = 0; cy < NY; cy++) {
      for (let cx = 0; cx < NX; cx++) {
        let sum = 0;
        let n = 0;
        for (let py = Math.floor(cy * cellH); py < Math.floor((cy + 1) * cellH); py++) {
          for (let px = Math.floor(cx * cellW); px < Math.floor((cx + 1) * cellW); px++) {
            sum += cap.grid[py * GRID_SIZE + px];
            n++;
          }
        }
        cellMeans[cy * NX + cx] += (sum / n) * w;
      }
    }
  }
  for (let i = 0; i < cellMeans.length; i++) cellMeans[i] /= totalWeight;

  // Quantile band
  const sorted = [...cellMeans].sort((a, b) => a - b);
  const q33 = sorted[Math.floor(sorted.length * 0.33)];
  const q66 = sorted[Math.floor(sorted.length * 0.66)];

  const zones: YieldZoneFeature[] = [];
  let zoneId = 1;
  for (let cy = 0; cy < NY; cy++) {
    for (let cx = 0; cx < NX; cx++) {
      const idx = cy * NX + cx;
      const mean = cellMeans[idx];
      const band: "low" | "mid" | "high" =
        mean < q33 ? "low" : mean < q66 ? "mid" : "high";

      const w0 = west + (cx / NX) * (east - west);
      const w1 = west + ((cx + 1) / NX) * (east - west);
      // y inverted: row 0 is north visually, but we want north=top (high lat)
      const yT = north - (cy / NY) * (north - south);
      const yB = north - ((cy + 1) / NY) * (north - south);
      const ring: number[][] = [
        [w0, yB],
        [w1, yB],
        [w1, yT],
        [w0, yT],
        [w0, yB],
      ];
      zones.push({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [ring] },
        properties: {
          zone_id: zoneId++,
          yield_index: round3(mean),
          band,
        },
      });
    }
  }
  return zones;
}

export function bandColor(band: "low" | "mid" | "high"): string {
  return band === "low" ? "#dc2626" : band === "mid" ? "#eab308" : "#15803d";
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
