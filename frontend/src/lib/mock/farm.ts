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
import { buildFmisData } from "./fmis";
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
    const fmis = buildFmisData(s.id, s.crop, s.fertilizer, s.plantedDate);

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
      ...fmis,
    });
  }

  return {
    id: DEMO_FARM.id,
    name: DEMO_FARM.name,
    ownerEmail: DEMO_FARM.ownerEmail,
    ownerName: "Frederick Scandolara",
    address: "Anwick, Sleaford NG34 9SE",
    region: "Lincolnshire, England",
    farmType: "Conventional arable",
    establishedYear: 1962,
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
    const plantedDate = sel.crop === "Winter wheat" ? "October 2024" : "April 2025";
    const fmis = buildFmisData(fieldId, sel.crop, sel.fertilizer, plantedDate);

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
      plantedDate,
      ndviHistory,
      yieldZones,
      ...fmis,
    });
  }
  const address = sessionStoreGet("yieldmaxxing.onboard.address");
  const { name, region } = deriveFarmIdentity(address);
  return {
    id: "user-farm-" + Math.round(Math.random() * 1e6),
    name,
    ownerEmail: args.ownerEmail,
    ownerName: deriveOwnerName(args.ownerEmail),
    address: address ?? "—",
    region,
    farmType: "Conventional arable",
    establishedYear: 1980 + Math.floor(Math.random() * 30),
    centroid: args.centroid,
    fields,
  };
}

function sessionStoreGet(key: string): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(key);
}

function deriveFarmIdentity(address: string | null): {
  name: string;
  region: string;
} {
  if (!address) return { name: "Home Farm", region: "United Kingdom" };
  // Best-effort: first comma-separated chunk → "<Place> Farm", remainder → region
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  const place = parts[0] ?? "Home";
  const region = parts.slice(1).join(", ") || "United Kingdom";
  // Strip postcodes / numbers from the place token
  const cleanPlace = place.replace(/\b[A-Z]{1,2}\d[\dA-Z]?\s*\d[A-Z]{2}\b/gi, "")
    .replace(/\d+/g, "")
    .trim() || "Home";
  return { name: `${cleanPlace} Farm`, region };
}

function deriveOwnerName(email: string): string {
  const local = email.split("@")[0] ?? "Owner";
  return local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(" ");
}

// Re-render NDVI blobs after rehydrate (blob: URLs don't survive page reload).
// Also backfills FMIS metadata on farms persisted before fmis.ts existed so the
// UI never crashes on missing fields (lastActivity, soilType, growthStage, ...).
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

    if (!field.lastActivity || !field.soilType || !field.growthStage) {
      const fmis = buildFmisData(
        field.id,
        field.crop,
        field.fertilizer,
        field.plantedDate,
      );
      Object.assign(field, fmis);
    }
  }
  return farm;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export { offsetLatLng };
