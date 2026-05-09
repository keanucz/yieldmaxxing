import { Polygon, Tooltip } from "react-leaflet";
import type { Field } from "../../types";
import { ringToLatLngs } from "../../lib/geo";

interface Props {
  fields: Field[];
  selectedId?: string | null;
  onClick?: (fieldId: string) => void;
  showLabels?: boolean;
}

export default function FieldPolygonsLayer({
  fields,
  selectedId,
  onClick,
  showLabels = true,
}: Props) {
  return (
    <>
      {fields.map((f) => {
        const positions = ringToLatLngs(f.feature.geometry.coordinates[0]);
        const selected = selectedId === f.id;
        return (
          <Polygon
            key={f.id}
            positions={positions}
            pathOptions={{
              color: selected ? "#22c55e" : "#ffffff",
              weight: selected ? 2.5 : 1.5,
              fillColor: selected ? "#22c55e" : "#ffffff",
              fillOpacity: selected ? 0.18 : 0.06,
              dashArray: selected ? undefined : "4 4",
            }}
            eventHandlers={{
              click: () => onClick?.(f.id),
              mouseover: (e) =>
                e.target.setStyle({ fillOpacity: selected ? 0.22 : 0.16 }),
              mouseout: (e) =>
                e.target.setStyle({ fillOpacity: selected ? 0.18 : 0.06 }),
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
