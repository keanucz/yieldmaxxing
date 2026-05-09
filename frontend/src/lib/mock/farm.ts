// Build the demo farm. NDVI float grids and rendered PNG blob URLs live in
// `runtimeCache` (RAM only) — what's persisted in the store is just the
// metadata shells (stats, dates, blob:<id>).
//
// On rehydrate, `hydrateFarm()` rebuilds grids + re-renders blobs from seeds.

import { DEMO_FARM } from "../../data/ukDemoFarm";
import { makeFieldFeature, bboxOfRing, centroidOfRing } from "./fields";
import { buildNDVIHistory, gridCaptureToCapture, type NDVIGridCapture } from "./ndvi";
import { buildYieldZones } from "./yieldZones";
import { renderNDVIBlobURL } from "../ndvi";
import { ringAreaHa, offsetLatLng } from "../geo";
import { makeRng } from "./seed";
import type { Farm, Field, FieldFeature } from "../../types";

// Per-field NDVI float grids (RAM only). Indexed by fieldId.
const gridCache = new Map<string, NDVIGridCapture[]>();

export function getGridCache(fieldId: string): NDVIGridCapture[] {
  let g = gridCache.get(fieldId);
  if (!g) {
    // Lazy rebuild from seed (deterministic) — survives page reload.
    const biasRng = makeRng("bias", fieldId);
    g = buildNDVIHistory(fieldId, {
      x: 0.25 + biasRng() * 0.5,
      y: 0.25 + biasRng() * 0.5,
      strength: 0.4 + biasRng() * 0.15,
    });
    gridCache.set(fieldId, g);
  }
  return g;
}

export async function buildDemoFarm(): Promise<Farm> {
  const seeds = DEMO_FARM.fields;
  const [centroidLat, centroidLng] = DEMO_FARM.centroid;

  const fields: Field[] = [];
  for (const s of seeds) {
    const [olat, olng] = s.offset;
    const fieldLat = centroidLat + olat;
    const fieldLng = centroidLng + olng;
    const polyRng = makeRng("field-poly", s.id);
    const targetHa = 6 + polyRng() * 8; // 6–14 ha
    const feature = makeFieldFeature(
      polyRng,
      s.id,
      fieldLat,
      fieldLng,
      targetHa,
      s.lucode,
      "2025-06-15",
    );
    const ring = feature.geometry.coordinates[0];
    const bbox = bboxOfRing(ring);
    const centroid = centroidOfRing(ring);
    const areaHa = ringAreaHa(ring);

    const gridHistory = buildNDVIHistory(s.id, s.problemBias);
    gridCache.set(s.id, gridHistory);

    // Render PNGs lazily — kick off but don't await all (we await first one).
    const ndviHistory = await Promise.all(
      gridHistory.map(async (cap) => {
        const url = await renderNDVIBlobURL(cap.grid, ring, bbox);
        return gridCaptureToCapture(cap, url);
      }),
    );

    const yieldZones = buildYieldZones(bbox, gridHistory);

    fields.push({
      id: s.id,
      name: s.name,
      slug: s.id,
      feature,
      centroid,
      bbox,
      areaHa: round2(areaHa),
      crop: s.crop,
      fertilizer: s.fertilizer,
      tractor: s.tractor,
      plantedDate: s.plantedDate,
      ndviHistory,
      yieldZones,
    });
  }

  return {
    id: DEMO_FARM.id,
    name: DEMO_FARM.name,
    ownerEmail: DEMO_FARM.ownerEmail,
    centroid: DEMO_FARM.centroid,
    fields,
  };
}

// Build a farm from arbitrary user-selected polygons (post-onboarding).
export async function buildFarmFromSelection(args: {
  centroid: [number, number];
  ownerEmail: string;
  selections: Array<{
    feature: FieldFeature;
    name: string;
    crop: Field["crop"];
    fertilizer: Field["fertilizer"];
    tractor: Field["tractor"];
  }>;
}): Promise<Farm> {
  const fields: Field[] = [];
  for (const sel of args.selections) {
    const ring = sel.feature.geometry.coordinates[0];
    const bbox = bboxOfRing(ring);
    const centroid = centroidOfRing(ring);
    const areaHa = ringAreaHa(ring);
    const fieldId = sel.feature.properties.CROMEID;

    // Deterministic bias seeded from CROMEID so demo replays identically.
    const biasRng = makeRng("bias", fieldId);
    const gridHistory = buildNDVIHistory(fieldId, {
      x: 0.25 + biasRng() * 0.5,
      y: 0.25 + biasRng() * 0.5,
      strength: 0.4 + biasRng() * 0.15,
    });
    gridCache.set(fieldId, gridHistory);
    const ndviHistory = await Promise.all(
      gridHistory.map(async (cap) => {
        const url = await renderNDVIBlobURL(cap.grid, ring, bbox);
        return gridCaptureToCapture(cap, url);
      }),
    );
    const yieldZones = buildYieldZones(bbox, gridHistory);

    fields.push({
      id: fieldId,
      name: sel.name,
      slug: fieldId.toLowerCase(),
      feature: sel.feature,
      centroid,
      bbox,
      areaHa: round2(areaHa),
      crop: sel.crop,
      fertilizer: sel.fertilizer,
      tractor: sel.tractor,
      plantedDate: "April 2025",
      ndviHistory,
      yieldZones,
    });
  }
  return {
    id: "user-farm-" + Math.round(Math.random() * 1e6),
    name: "My Farm",
    ownerEmail: args.ownerEmail,
    centroid: args.centroid,
    fields,
  };
}

// Re-render NDVI blobs after rehydrate (blob: URLs don't survive page reload).
export async function rehydrateBlobs(farm: Farm): Promise<Farm> {
  for (const field of farm.fields) {
    let grids = gridCache.get(field.id);
    if (!grids) {
      // Reconstruct grids from seed (deterministic, matches buildFarmFromSelection)
      const biasRng = makeRng("bias", field.id);
      grids = buildNDVIHistory(field.id, {
        x: 0.25 + biasRng() * 0.5,
        y: 0.25 + biasRng() * 0.5,
        strength: 0.4 + biasRng() * 0.15,
      });
      gridCache.set(field.id, grids);
    }
    const ring = field.feature.geometry.coordinates[0];
    const newHistory = await Promise.all(
      grids.map(async (cap) => {
        const url = await renderNDVIBlobURL(cap.grid, ring, field.bbox);
        return gridCaptureToCapture(cap, url);
      }),
    );
    field.ndviHistory = newHistory;
  }
  return farm;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export { offsetLatLng };
