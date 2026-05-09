// Light geodesy helpers. No turf — we only need a few primitives.

const R = 6_371_008.8; // mean Earth radius, meters (WGS84)
const D2R = Math.PI / 180;

export type LatLng = [number, number]; // [lat, lng]

export function bboxOfRing(ring: number[][]): [number, number, number, number] {
  let minLng = Infinity,
    maxLng = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;
  for (const [lng, lat] of ring) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLng, minLat, maxLng, maxLat];
}

export function centroidOfRing(ring: number[][]): LatLng {
  let sx = 0,
    sy = 0;
  // Drop the duplicate close point if present
  const n = ring[ring.length - 1] === ring[0] ? ring.length - 1 : ring.length;
  for (let i = 0; i < n; i++) {
    sx += ring[i][0];
    sy += ring[i][1];
  }
  return [sy / n, sx / n];
}

// Spherical-excess polygon area. Returns m². Ring is GeoJSON [lng, lat] order.
export function ringAreaM2(ring: number[][]): number {
  const n = ring.length;
  if (n < 4) return 0;
  let total = 0;
  for (let i = 0; i < n - 1; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[i + 1];
    total += (lng2 - lng1) * D2R * (2 + Math.sin(lat1 * D2R) + Math.sin(lat2 * D2R));
  }
  return Math.abs((total * R * R) / 2);
}

export function ringAreaHa(ring: number[][]): number {
  return ringAreaM2(ring) / 10_000;
}

// Offset a lat/lng by meters (small distances).
export function offsetLatLng(
  lat: number,
  lng: number,
  dxMeters: number,
  dyMeters: number,
): LatLng {
  const dLat = dyMeters / R;
  const dLng = dxMeters / (R * Math.cos(lat * D2R));
  return [lat + dLat / D2R, lng + dLng / D2R];
}

// Point-in-polygon (ray-casting) using GeoJSON-style ring [lng, lat][].
export function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Convert GeoJSON polygon ring → Leaflet [lat, lng][] for <Polygon positions>.
export function ringToLatLngs(ring: number[][]): LatLng[] {
  return ring.map(([lng, lat]) => [lat, lng] as LatLng);
}

// [lat, lng] tuple → GeoJSON [lng, lat]
export function latLngToGeoJSON(p: LatLng): [number, number] {
  return [p[1], p[0]];
}
