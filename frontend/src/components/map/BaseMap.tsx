import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";

interface BaseMapProps {
  center: [number, number];
  zoom: number;
  flyToCenter?: [number, number];
  flyToZoom?: number;
  fitBounds?: [number, number, number, number]; // [west, south, east, north]
  children?: React.ReactNode;
}

function ViewController({
  flyToCenter,
  flyToZoom,
  fitBounds,
}: Pick<BaseMapProps, "flyToCenter" | "flyToZoom" | "fitBounds">) {
  const map = useMap();
  useEffect(() => {
    if (fitBounds) {
      const [w, s, e, n] = fitBounds;
      map.fitBounds(
        L.latLngBounds([
          [s, w],
          [n, e],
        ]),
        { padding: [40, 40], duration: 0.6 } as L.FitBoundsOptions,
      );
    } else if (flyToCenter) {
      map.flyTo(flyToCenter, flyToZoom ?? map.getZoom(), { duration: 0.6 });
    }
  }, [
    flyToCenter?.[0],
    flyToCenter?.[1],
    flyToZoom,
    fitBounds?.[0],
    fitBounds?.[1],
    fitBounds?.[2],
    fitBounds?.[3],
  ]);
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export default function BaseMap({
  center,
  zoom,
  flyToCenter,
  flyToZoom,
  fitBounds,
  children,
}: BaseMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      zoomControl={false}
      attributionControl={false}
      style={{ height: "100%", width: "100%", background: "#050505" }}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={19}
      />
      <ViewController
        flyToCenter={flyToCenter}
        flyToZoom={flyToZoom}
        fitBounds={fitBounds}
      />
      {children}
    </MapContainer>
  );
}
