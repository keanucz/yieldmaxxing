import type { Field } from "../../types";
import { ndviToCSS } from "../../lib/ndvi";

interface Props {
  field: Field;
  size?: number;
}

export default function FieldShape({ field, size = 36 }: Props) {
  const ring = field.feature.geometry.coordinates[0];
  const [w, s, e, n] = field.bbox;
  const dx = e - w;
  const dy = n - s;
  const scale = (size - 4) / Math.max(dx, dy);
  // Center it
  const offsetX = (size - dx * scale) / 2;
  const offsetY = (size - dy * scale) / 2;
  const points = ring
    .map(([lng, lat]) => {
      const x = (lng - w) * scale + offsetX;
      // SVG y is inverted vs lat
      const y = size - ((lat - s) * scale + offsetY);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const peak = pickPeak(field);
  const fill = ndviToCSS(peak);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="field-shape"
      aria-hidden
    >
      <polygon
        points={points}
        fill={fill}
        fillOpacity={0.55}
        stroke={fill}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function pickPeak(f: Field): number {
  let best = f.ndviHistory[0]?.ndviStats.mean ?? 0;
  for (const c of f.ndviHistory) if (c.ndviStats.mean > best) best = c.ndviStats.mean;
  return best;
}
