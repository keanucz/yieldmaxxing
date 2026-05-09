// Runtime NDVI → PNG renderer. Maps a 256×256 Float32 NDVI grid + a polygon
// mask to an RGBA PNG via a baked colormap LUT. Returns a blob: URL ready for
// Leaflet ImageOverlay. Same code path will accept real Sentinel-2 grids
// (FLOAT32 GeoTIFF unpacked client-side) when we wire the real backend.

import { pointInRing } from "./geo";

const GRID_SIZE = 256;

// 5-band ramp: bare → stressed → mid → healthy → peak.
const RAMP: Array<[number, [number, number, number]]> = [
  [0.0, [0x8b, 0x45, 0x13]], // bare soil (saddle brown)
  [0.25, [0xea, 0xb3, 0x08]], // stressed (yellow)
  [0.5, [0x84, 0xcc, 0x16]], // mid (light green)
  [0.7, [0x15, 0x80, 0x3d]], // healthy (green)
  [1.0, [0x06, 0x4e, 0x3b]], // peak (dark green)
];

// 256-entry RGBA LUT built once.
const LUT = (() => {
  const lut = new Uint8ClampedArray(256 * 4);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    // Interpolate
    let lo = RAMP[0],
      hi = RAMP[RAMP.length - 1];
    for (let k = 0; k < RAMP.length - 1; k++) {
      if (t >= RAMP[k][0] && t <= RAMP[k + 1][0]) {
        lo = RAMP[k];
        hi = RAMP[k + 1];
        break;
      }
    }
    const span = hi[0] - lo[0] || 1;
    const f = (t - lo[0]) / span;
    lut[i * 4 + 0] = Math.round(lo[1][0] + (hi[1][0] - lo[1][0]) * f);
    lut[i * 4 + 1] = Math.round(lo[1][1] + (hi[1][1] - lo[1][1]) * f);
    lut[i * 4 + 2] = Math.round(lo[1][2] + (hi[1][2] - lo[1][2]) * f);
    lut[i * 4 + 3] = 220; // semi-transparent so satellite basemap reads through
  }
  return lut;
})();

// Cache: fieldId+captureIdx → blob URL. We don't expose this — the renderer
// is called with a stable cache key by the caller.
const blobCache = new Map<string, string>();

function maskFor(
  ring: number[][],
  bbox: [number, number, number, number],
): Uint8Array {
  const [west, south, east, north] = bbox;
  const mask = new Uint8Array(GRID_SIZE * GRID_SIZE);
  for (let y = 0; y < GRID_SIZE; y++) {
    // Pixel y=0 is at the top of image (north). Map y → lat from north→south.
    const lat = north - ((y + 0.5) / GRID_SIZE) * (north - south);
    for (let x = 0; x < GRID_SIZE; x++) {
      const lng = west + ((x + 0.5) / GRID_SIZE) * (east - west);
      mask[y * GRID_SIZE + x] = pointInRing(lng, lat, ring) ? 1 : 0;
    }
  }
  return mask;
}

export async function renderNDVIBlobURL(
  grid: Float32Array,
  ring: number[][],
  bbox: [number, number, number, number],
  cacheKey?: string,
): Promise<string> {
  if (cacheKey && blobCache.has(cacheKey)) {
    return blobCache.get(cacheKey)!;
  }
  const mask = maskFor(ring, bbox);
  const data = new Uint8ClampedArray(GRID_SIZE * GRID_SIZE * 4);
  for (let i = 0; i < grid.length; i++) {
    if (mask[i] === 0) {
      data[i * 4 + 3] = 0;
      continue;
    }
    const v = grid[i];
    const idx = Math.max(0, Math.min(255, Math.round(v * 255))) * 4;
    data[i * 4 + 0] = LUT[idx + 0];
    data[i * 4 + 1] = LUT[idx + 1];
    data[i * 4 + 2] = LUT[idx + 2];
    data[i * 4 + 3] = LUT[idx + 3];
  }

  let blob: Blob;
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(GRID_SIZE, GRID_SIZE);
    const ctx = canvas.getContext("2d")!;
    const img = new ImageData(data, GRID_SIZE, GRID_SIZE);
    ctx.putImageData(img, 0, 0);
    blob = await canvas.convertToBlob({ type: "image/png" });
  } else {
    const canvas = document.createElement("canvas");
    canvas.width = GRID_SIZE;
    canvas.height = GRID_SIZE;
    const ctx = canvas.getContext("2d")!;
    const img = new ImageData(data, GRID_SIZE, GRID_SIZE);
    ctx.putImageData(img, 0, 0);
    blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/png"),
    );
  }
  const url = URL.createObjectURL(blob);
  if (cacheKey) blobCache.set(cacheKey, url);
  return url;
}

// Render a swatch for the legend / health ring (just maps an NDVI scalar to RGB).
export function ndviToRGB(v: number): [number, number, number] {
  const idx = Math.max(0, Math.min(255, Math.round(v * 255))) * 4;
  return [LUT[idx], LUT[idx + 1], LUT[idx + 2]];
}

export function ndviToCSS(v: number): string {
  const [r, g, b] = ndviToRGB(v);
  return `rgb(${r},${g},${b})`;
}
