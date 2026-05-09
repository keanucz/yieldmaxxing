import { Polygon, Tooltip } from "react-leaflet";
import type { PrescriptionZoneFeature } from "../../types";
import { ringToLatLngs } from "../../lib/geo";
import { rateBandColor } from "../../lib/mock/prescription";

interface Props {
  zones: PrescriptionZoneFeature[];
}

export default function PrescriptionLayer({ zones }: Props) {
  return (
    <>
      {zones.map((z) => {
        const positions = ringToLatLngs(z.geometry.coordinates[0]);
        const color = rateBandColor(z.properties.band);
        const label =
          z.properties.rate_kg_ha === 0
            ? "skip"
            : `${z.properties.rate_kg_ha} kg/ha`;
        return (
          <Polygon
            key={z.properties.zone_id + ":" + z.geometry.coordinates[0][0].join(",")}
            positions={positions}
            pathOptions={{
              color: "#ffffff",
              weight: 0.5,
              fillColor: color,
              fillOpacity: 0.6,
            }}
            interactive={false}
          >
            <Tooltip direction="center" permanent className="cg-rate-label">
              {label}
            </Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}
