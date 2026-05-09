// Fake CROME-shaped polygon detection around a (lat, lng) for the onboarding
// "auto-detect fields" flow. Real CROME would be a WFS GetFeature request
// against the DEFRA endpoint with a bbox parameter — we mock 6–8 candidate
// polygons in a deterministic ring around the input point.

import { makeIrregularQuad, cromeIdFor } from "./fields";
import { makeRng } from "./seed";
import { ringAreaHa, offsetLatLng } from "../geo";
import type { FieldFeature, LUCODE } from "../../types";

const SAMPLE_LUCODES: LUCODE[] = ["AC05", "AC02", "AC06", "AC01", "PG01"];
const REF_DATE = "2025-06-15";

export function detectFields(lat: number, lng: number, count = 7): FieldFeature[] {
  const rng = makeRng("crome-detect", lat.toFixed(4), lng.toFixed(4));
  const out: FieldFeature[] = [];

  for (let i = 0; i < count; i++) {
    // Ring of fields around the centroid, at radii 200–900m
    const angle = (i / count) * Math.PI * 2 + rng() * 0.4;
    const radius = 250 + rng() * 600;
    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius;
    const [flat, flng] = offsetLatLng(lat, lng, dx, dy);
    const targetHa = 5 + rng() * 9; // 5–14 ha
    const ring = makeIrregularQuad(rng, flat, flng, targetHa);
    if (ring.length === 0) continue;
    const id = `cand-${i}-${Math.round(flat * 1e4)}-${Math.round(flng * 1e4)}`;
    const lucode =
      SAMPLE_LUCODES[Math.floor(rng() * SAMPLE_LUCODES.length)];
    out.push({
      type: "Feature",
      id: cromeIdFor(id),
      geometry: { type: "Polygon", coordinates: [ring] },
      properties: {
        CROMEID: cromeIdFor(id),
        LUCODE: lucode,
        REFDATE: REF_DATE,
        PROB: 0.86 + rng() * 0.13,
      },
    });
  }
  // Filter out implausibly small/large
  return out.filter((f) => {
    const ha = ringAreaHa(f.geometry.coordinates[0]);
    return ha >= 3 && ha <= 18;
  });
}
