import { Polygon, Tooltip } from "react-leaflet";
import type { YieldZoneFeature } from "../../types";
import { ringToLatLngs } from "../../lib/geo";
import { bandColor } from "../../lib/mock/yieldZones";

interface Props {
  zones: YieldZoneFeature[];
}

export default function YieldZoneLayer({ zones }: Props) {
  return (
    <>
      {zones.map((z) => {
        const positions = ringToLatLngs(z.geometry.coordinates[0]);
        const color = bandColor(z.properties.band);
        return (
          <Polygon
            key={z.properties.zone_id}
            positions={positions}
            pathOptions={{
              color: "#ffffff",
              weight: 0.5,
              fillColor: color,
              fillOpacity: 0.45,
            }}
            interactive={false}
          >
            <Tooltip direction="center" permanent className="cg-rate-label">
              {z.properties.band === "low"
                ? "Low yield"
                : z.properties.band === "mid"
                  ? "Mid"
                  : "High yield"}
            </Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}
