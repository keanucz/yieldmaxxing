import seedrandom from "seedrandom";

const NAMESPACE = "yieldmaxxing-v1";

export function makeRng(...parts: Array<string | number>) {
  return seedrandom([NAMESPACE, ...parts.map(String)].join(":"));
}

// Deterministic 2D value-noise (3-octave). Seeded by the rng. Returns a
// function that maps (x, y) ∈ [0, 1]² to noise ∈ [-1, 1].
export function makeValueNoise2D(rng: seedrandom.PRNG) {
  const GRID = 8;
  const grid: number[][] = [];
  for (let i = 0; i <= GRID; i++) {
    grid[i] = [];
    for (let j = 0; j <= GRID; j++) {
      grid[i][j] = rng() * 2 - 1;
    }
  }
  const fade = (t: number) => t * t * (3 - 2 * t);
  function octave(x: number, y: number) {
    const fx = x * GRID;
    const fy = y * GRID;
    const x0 = Math.min(GRID, Math.floor(fx));
    const y0 = Math.min(GRID, Math.floor(fy));
    const x1 = Math.min(GRID, x0 + 1);
    const y1 = Math.min(GRID, y0 + 1);
    const tx = fade(fx - x0);
    const ty = fade(fy - y0);
    const a = grid[x0][y0] * (1 - tx) + grid[x1][y0] * tx;
    const b = grid[x0][y1] * (1 - tx) + grid[x1][y1] * tx;
    return a * (1 - ty) + b * ty;
  }
  return (x: number, y: number) => {
    // Sum 3 octaves. Higher freq via re-tiling — noise re-uses same grid to
    // stay deterministic.
    const f0 = octave(x, y);
    const f1 = octave((x * 2) % 1, (y * 2) % 1) * 0.5;
    const f2 = octave((x * 4) % 1, (y * 4) % 1) * 0.25;
    return (f0 + f1 + f2) / 1.75;
  };
}

export function clamp01(v: number) {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}
