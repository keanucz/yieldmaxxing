import { useEffect } from "react";
import { MapContainer, TileLayer, Polygon, Tooltip, useMap } from "react-leaflet";
import {
  FIELDS,
  HOME_CENTER,
  HOME_ZOOM,
  FIELD_ZOOM,
  ndviToColor,
  ndviToStatus,
  PRESCRIPTION,
} from "../data/fields";

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.0 });
  }, [center, zoom, map]);
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export default function FieldMap({
  mode,
  selectedField,
  onFieldClick,
  selectedZone,
  onZoneClick,
}) {
  const center = selectedField ? selectedField.center : HOME_CENTER;
  const zoom = selectedField ? FIELD_ZOOM : HOME_ZOOM;

  return (
    <MapContainer
      center={HOME_CENTER}
      zoom={HOME_ZOOM}
      zoomControl={false}
      attributionControl={false}
      style={{ height: "100%", width: "100%", background: "#000" }}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={19}
      />
      <MapController center={center} zoom={zoom} />

      {mode === "home" &&
        FIELDS.map((field) => (
          <Polygon
            key={field.id}
            positions={field.polygon}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: "#ffffff",
              fillOpacity: 0.08,
              dashArray: "4 4",
            }}
            eventHandlers={{
              click: () => onFieldClick?.(field),
              mouseover: (e) =>
                e.target.setStyle({ fillOpacity: 0.2, dashArray: null }),
              mouseout: (e) =>
                e.target.setStyle({ fillOpacity: 0.08, dashArray: "4 4" }),
            }}
          >
            <Tooltip direction="center" permanent className="cg-field-label">
              {field.name} · {field.acres} ac
            </Tooltip>
          </Polygon>
        ))}

      {(mode === "ndvi" || mode === "prescription") && selectedField && (
        <>
          <Polygon
            positions={selectedField.polygon}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fill: false,
            }}
            interactive={false}
          />
          {selectedField.zones.map((zone) => {
            const status = ndviToStatus(zone.ndvi);
            const color = ndviToColor(zone.ndvi);
            const isSelected = selectedZone?.id === zone.id;
            const label =
              mode === "prescription"
                ? PRESCRIPTION[status].label
                : `NDVI ${zone.ndvi.toFixed(2)}`;
            return (
              <Polygon
                key={zone.id}
                positions={zone.polygon}
                pathOptions={{
                  color: isSelected ? "#ffffff" : color,
                  weight: isSelected ? 2.5 : 1,
                  fillColor: color,
                  fillOpacity: isSelected ? 0.85 : 0.6,
                }}
                eventHandlers={{
                  click: () => onZoneClick?.(zone),
                }}
              >
                <Tooltip
                  direction="center"
                  permanent
                  className="cg-zone-label"
                >
                  {label}
                </Tooltip>
              </Polygon>
            );
          })}
        </>
      )}
    </MapContainer>
  );
}
