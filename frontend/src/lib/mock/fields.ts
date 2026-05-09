import { offsetLatLng, ringAreaHa, bboxOfRing, centroidOfRing } from "../geo";
import { makeRng } from "./seed";
import type { CROMEProps, FieldFeature, LUCODE } from "../../types";

// Build a single irregular quad polygon centered at (lat, lng), aiming for
// `targetHa` hectares. Reject + retry if too small/large.
export function makeIrregularQuad(
  rng: ReturnType<typeof makeRng>,
  lat: number,
  lng: number,
  targetHa: number,
): number[][] {
  // Half-side length aiming for targetHa with a bit of slack
  const side = Math.sqrt(targetHa * 10_000) * 0.55;

  for (let attempt = 0; attempt < 12; attempt++) {
    // Rotation 0..30°
    const theta = rng() * (Math.PI / 6);
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    // 4 corner offsets (m), local frame
    const corners: Array<[number, number]> = [
      [-side * (0.85 + rng() * 0.3), -side * (0.85 + rng() * 0.3)],
      [side * (0.85 + rng() * 0.3), -side * (0.7 + rng() * 0.4)],
      [side * (0.85 + rng() * 0.3), side * (0.85 + rng() * 0.3)],
      [-side * (0.7 + rng() * 0.4), side * (0.85 + rng() * 0.3)],
    ];
    const ring = corners.map(([dx, dy]) => {
      const rx = cos * dx - sin * dy;
      const ry = sin * dx + cos * dy;
      const ll = offsetLatLng(lat, lng, rx, ry);
      return [ll[1], ll[0]] as [number, number];
    });
    // Close ring
    ring.push(ring[0]);

    const ha = ringAreaHa(ring);
    if (ha >= targetHa * 0.7 && ha <= targetHa * 1.3) {
      return ring;
    }
  }
  // Last attempt fallback (return whatever we built — better than crashing)
  return [];
}

export function makeFieldFeature(
  rng: ReturnType<typeof makeRng>,
  fieldId: string,
  lat: number,
  lng: number,
  targetHa: number,
  lucode: LUCODE,
  refDate: string,
): FieldFeature {
  let ring: number[][] = [];
  for (let i = 0; i < 4 && ring.length === 0; i++) {
    ring = makeIrregularQuad(rng, lat, lng, targetHa);
  }
  // Force-close if needed
  if (ring.length && ring[0] !== ring[ring.length - 1]) {
    ring.push(ring[0]);
  }
  const props: CROMEProps = {
    CROMEID: cromeIdFor(fieldId),
    LUCODE: lucode,
    REFDATE: refDate,
    PROB: 0.92 + rng() * 0.07,
  };
  return {
    type: "Feature",
    id: cromeIdFor(fieldId),
    geometry: { type: "Polygon", coordinates: [ring] },
    properties: props,
  };
}

export function cromeIdFor(fieldId: string): string {
  // Real CROME uses RPA + 12-digit Easting/Northing. We mock with "CG" + hash.
  let h = 5381;
  for (let i = 0; i < fieldId.length; i++) {
    h = ((h << 5) + h + fieldId.charCodeAt(i)) >>> 0;
  }
  return "CG" + String(h).padStart(12, "0").slice(-12);
}

export { bboxOfRing, centroidOfRing };
