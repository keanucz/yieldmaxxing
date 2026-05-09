import { Polygon, Tooltip } from "react-leaflet";
import type { FieldFeature } from "../../types";
import { ringToLatLngs } from "../../lib/geo";
import { ringAreaHa } from "../../lib/geo";

interface Props {
  candidates: FieldFeature[];
  selectedIds: Set<string>;
  onToggle: (cromeId: string) => void;
}

export default function CandidatePolygons({
  candidates,
  selectedIds,
  onToggle,
}: Props) {
  return (
    <>
      {candidates.map((f) => {
        const id = f.properties.CROMEID;
        const positions = ringToLatLngs(f.geometry.coordinates[0]);
        const isSelected = selectedIds.has(id);
        const ha = ringAreaHa(f.geometry.coordinates[0]).toFixed(1);
        return (
          <Polygon
            key={id}
            positions={positions}
            pathOptions={{
              color: isSelected ? "#22c55e" : "#ffffff",
              weight: isSelected ? 2.5 : 1.5,
              fillColor: isSelected ? "#22c55e" : "#ffffff",
              fillOpacity: isSelected ? 0.22 : 0.06,
              dashArray: isSelected ? undefined : "4 4",
            }}
            eventHandlers={{ click: () => onToggle(id) }}
          >
            <Tooltip direction="center" permanent className="cg-field-label">
              {ha} ha · {f.properties.LUCODE}
            </Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}
