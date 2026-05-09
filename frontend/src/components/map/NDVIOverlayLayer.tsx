// THE technical centerpiece. Keep a SINGLE Leaflet ImageOverlay instance and
// swap its URL on capture change via setUrl(). Leaflet preloads the new image
// before swapping, so scrubbing the slider is flicker-free.

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

interface Props {
  bbox: [number, number, number, number]; // [west, south, east, north]
  pngUrl: string;
  opacity?: number;
}

export default function NDVIOverlayLayer({ bbox, pngUrl, opacity = 0.85 }: Props) {
  const map = useMap();
  const ref = useRef<L.ImageOverlay | null>(null);

  // Mount once; remove on unmount.
  useEffect(() => {
    const [w, s, e, n] = bbox;
    const bounds = L.latLngBounds([
      [s, w],
      [n, e],
    ]);
    const overlay = L.imageOverlay(pngUrl, bounds, {
      opacity,
      interactive: false,
      crossOrigin: false,
    });
    overlay.addTo(map);
    ref.current = overlay;
    return () => {
      overlay.remove();
      ref.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, bbox[0], bbox[1], bbox[2], bbox[3]]);

  // Swap URL on change (no unmount, no flicker).
  useEffect(() => {
    if (ref.current) ref.current.setUrl(pngUrl);
  }, [pngUrl]);

  // Update opacity in place
  useEffect(() => {
    if (ref.current) ref.current.setOpacity(opacity);
  }, [opacity]);

  return null;
}
