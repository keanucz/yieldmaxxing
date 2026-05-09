// Generate the 12-month NDVI history for a field. Each capture has a 256×256
// float grid (the "raw" NDVI we'd get from Sentinel Hub if we asked for FLOAT32),
// derived from a seasonal curve + seeded value-noise.
//
// The grid is *not* part of the on-the-wire shape — only the stats and the
// rendered PNG blob URL are. The grid is exposed in-memory so the canvas
// renderer in `lib/ndvi.ts` can paint it.

import { makeRng, makeValueNoise2D, clamp01 } from "./seed";
import {
  CAPTURE_DISTRIBUTION,
  ANCHOR_YEAR,
  CLOUDY_CAPTURE_INDEX,
} from "../../data/ukDemoFarm";
import type { NDVICapture, NDVIStats } from "../../types";

export const GRID_SIZE = 256;

export interface NDVIGridCapture {
  capturedAt: string;
  cloudCoverPct: number;
  ndviStats: NDVIStats;
  // 256×256 row-major NDVI floats in [0, 1]
  grid: Float32Array;
}

// Seasonal NDVI curve for UK corn (0-365 day-of-year → NDVI 0..1).
// Bare in winter, green-up Apr, peak ~Jul, senescence Sep, harvest Oct.
function seasonalNDVI(doy: number): number {
  // Centered Gaussian peak at day 200 (~mid Jul), σ ~70 days, baseline 0.15
  const peak = 0.82;
  const baseline = 0.15;
  const center = 200;
  const sigma = 70;
  const g = Math.exp(-((doy - center) ** 2) / (2 * sigma * sigma));
  return baseline + (peak - baseline) * g;
}

function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const diff = d.valueOf() - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function captureDates(yearAnchor: number): string[] {
  const dates: string[] = [];
  for (const [month, count] of CAPTURE_DISTRIBUTION) {
    for (let i = 0; i < count; i++) {
      // Spread captures across the month at days ~5, 15, 25
      const day = count === 1 ? 14 : Math.round(5 + (i * 25) / count);
      // Real Sentinel-2 over UK passes around 10:30 UTC
      const d = new Date(Date.UTC(yearAnchor, month, day, 10, 32, 0));
      dates.push(d.toISOString());
    }
  }
  // Should be 18 entries
  return dates;
}

export function buildNDVIHistory(
  fieldId: string,
  problemBias: { x: number; y: number; strength: number },
): NDVIGridCapture[] {
  const noiseRng = makeRng("ndvi-noise", fieldId);
  const noise = makeValueNoise2D(noiseRng);
  const dates = captureDates(ANCHOR_YEAR);
  const captures: NDVIGridCapture[] = [];

  for (let i = 0; i < dates.length; i++) {
    const dateIso = dates[i];
    const d = new Date(dateIso);
    const base = seasonalNDVI(dayOfYear(d));

    const grid = new Float32Array(GRID_SIZE * GRID_SIZE);

    // Per-capture jitter
    const captureRng = makeRng("ndvi-capture", fieldId, dateIso);
    const captureJitter = (captureRng() - 0.5) * 0.06;

    let min = 1,
      max = 0,
      sum = 0;
    const samples: number[] = [];

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const u = x / (GRID_SIZE - 1);
        const v = y / (GRID_SIZE - 1);
        // Persistent spatial structure
        const n = noise(u, v) * 0.18;
        // Problem zone bias — gaussian dip centered at problemBias
        const dx = u - problemBias.x;
        const dy = v - problemBias.y;
        const dip =
          problemBias.strength *
          Math.exp(-(dx * dx + dy * dy) / (2 * 0.12 * 0.12));
        const value = clamp01(base + captureJitter + n - dip);
        grid[y * GRID_SIZE + x] = value;
        if (value < min) min = value;
        if (value > max) max = value;
        sum += value;
        if ((y * GRID_SIZE + x) % 64 === 0) samples.push(value);
      }
    }
    samples.sort((a, b) => a - b);
    const p = (q: number) => samples[Math.min(samples.length - 1, Math.max(0, Math.floor(samples.length * q)))];

    const ndviStats: NDVIStats = {
      min: round3(min),
      max: round3(max),
      mean: round3(sum / grid.length),
      p10: round3(p(0.1)),
      p50: round3(p(0.5)),
      p90: round3(p(0.9)),
    };

    const cloudCoverPct =
      i === CLOUDY_CAPTURE_INDEX ? 62 : Math.round(captureRng() * 18);

    captures.push({
      capturedAt: dateIso,
      cloudCoverPct,
      ndviStats,
      grid,
    });
  }
  return captures;
}

// On-the-wire shape (without the float grid). Use this when persisting/etc.
export function gridCaptureToCapture(c: NDVIGridCapture, pngUrl: string): NDVICapture {
  return {
    capturedAt: c.capturedAt,
    pngUrl,
    ndviStats: c.ndviStats,
    cloudCoverPct: c.cloudCoverPct,
  };
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
