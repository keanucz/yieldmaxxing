import { Polygon, Tooltip } from "react-leaflet";
import type { Field } from "../../types";
import { ringToLatLngs } from "../../lib/geo";

interface Props {
  fields: Field[];
  selectedId?: string | null;
  highlightedId?: string | null;
  onClick?: (fieldId: string) => void;
  showLabels?: boolean;
}

export default function FieldPolygonsLayer({
  fields,
  selectedId,
  highlightedId,
  onClick,
  showLabels = true,
}: Props) {
  return (
    <>
      {fields.map((f) => {
        const positions = ringToLatLngs(f.feature.geometry.coordinates[0]);
        const selected = selectedId === f.id;
        const highlighted = highlightedId === f.id;
        const accent = selected || highlighted;
        return (
          <Polygon
            key={f.id}
            positions={positions}
            pathOptions={{
              color: accent ? "#22c55e" : "#ffffff",
              weight: accent ? 2.5 : 1.5,
              fillColor: accent ? "#22c55e" : "#ffffff",
              fillOpacity: accent ? 0.22 : 0.06,
              dashArray: accent ? undefined : "4 4",
            }}
            eventHandlers={{
              click: () => onClick?.(f.id),
              mouseover: (e) =>
                e.target.setStyle({ fillOpacity: accent ? 0.28 : 0.16 }),
              mouseout: (e) =>
                e.target.setStyle({ fillOpacity: accent ? 0.22 : 0.06 }),
            }}
          >
            {showLabels && (
              <Tooltip direction="center" permanent className="cg-field-label">
                {f.name} · {f.areaHa} ha
              </Tooltip>
            )}
          </Polygon>
        );
      })}
    </>
  );
}
