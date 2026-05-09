import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFarmStore } from "../store/farmStore";
import { useUIStore } from "../store/uiStore";
import Shell from "../components/Shell";
import BaseMap from "../components/map/BaseMap";
import NDVIOverlayLayer from "../components/map/NDVIOverlayLayer";
import YieldZoneLayer from "../components/map/YieldZoneLayer";
import { Polygon } from "react-leaflet";
import TimeSlider from "../components/controls/TimeSlider";
import Legend from "../components/map/Legend";
import HealthRing from "../components/ui/HealthRing";
import { ringToLatLngs } from "../lib/geo";

export default function FieldDetail() {
  const navigate = useNavigate();
  const { fieldId } = useParams();
  const farm = useFarmStore((s) => s.farm);
  const selectedCaptureIdx = useFarmStore((s) => s.selectedCaptureIdx);
  const setSelectedCaptureIdx = useFarmStore((s) => s.setSelectedCaptureIdx);
  const showYield = useUIStore((s) => s.showYieldZones);
  const setShowYield = useUIStore((s) => s.setShowYieldZones);

  useEffect(() => {
    if (fieldId) useFarmStore.getState().setSelectedField(fieldId);
  }, [fieldId]);

  if (!farm) {
    navigate("/", { replace: true });
    return null;
  }
  const field = farm.fields.find((f) => f.id === fieldId);
  if (!field) {
    navigate("/farm", { replace: true });
    return null;
  }
  const idx = Math.max(
    0,
    Math.min(field.ndviHistory.length - 1, selectedCaptureIdx),
  );
  const cap = field.ndviHistory[idx];

  return (
    <Shell showBack backTo="/farm">
      <div className="map-page">
        <div className="sidebar">
          <div className="section-label">{field.name}</div>
          <HealthRing meanNDVI={cap.ndviStats.mean} label="Current health" />

          <div className="stat-row">
            <div className="stat">
              <div className="label">Crop</div>
              <div className="value" style={{ fontSize: 13 }}>
                {field.crop}
              </div>
            </div>
            <div className="stat">
              <div className="label">Area</div>
              <div className="value">{field.areaHa} ha</div>
            </div>
          </div>
          <div className="stat-row">
            <div className="stat">
              <div className="label">Fertilizer</div>
              <div className="value" style={{ fontSize: 13 }}>
                {field.fertilizer}
              </div>
            </div>
            <div className="stat">
              <div className="label">Tractor</div>
              <div className="value" style={{ fontSize: 13 }}>
                {field.tractor}
              </div>
            </div>
          </div>

          <div className="section-label">NDVI snapshot</div>
          <div className="summary-card">
            <div className="row">
              <span className="k">Mean</span>
              <span className="v">{cap.ndviStats.mean.toFixed(2)}</span>
            </div>
            <div className="row">
              <span className="k">Range (p10–p90)</span>
              <span className="v">
                {cap.ndviStats.p10.toFixed(2)} – {cap.ndviStats.p90.toFixed(2)}
              </span>
            </div>
            <div className="row">
              <span className="k">Cloud cover</span>
              <span className="v">{cap.cloudCoverPct}%</span>
            </div>
          </div>

          <div className="section-label">CROME</div>
          <div className="summary-card">
            <div className="row">
              <span className="k">CROMEID</span>
              <span className="v" style={{ fontSize: 11 }}>
                {field.feature.properties.CROMEID}
              </span>
            </div>
            <div className="row">
              <span className="k">LUCODE</span>
              <span className="v">{field.feature.properties.LUCODE}</span>
            </div>
          </div>
        </div>

        <div className="stage">
          <BaseMap
            center={field.centroid}
            zoom={16}
            fitBounds={field.bbox}
          >
            <Polygon
              positions={ringToLatLngs(field.feature.geometry.coordinates[0])}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                fill: false,
              }}
              interactive={false}
            />
            <NDVIOverlayLayer bbox={field.bbox} pngUrl={cap.pngUrl} />
            {showYield && <YieldZoneLayer zones={field.yieldZones} />}
          </BaseMap>

          <div className="map-overlay top-right-pill">
            <button
              className={`pill ${showYield ? "active" : ""}`}
              onClick={() => setShowYield(!showYield)}
            >
              <span className="dot" />
              {showYield ? "Yield zones on" : "Show yield zones"}
            </button>
          </div>

          <Legend stats={cap.ndviStats} />

          <button
            className="btn-primary map-overlay bottom-right-cta"
            style={{ width: "auto", minWidth: 220 }}
            onClick={() => navigate(`/field/${field.id}/prescribe`)}
          >
            Get fertilizer plan →
          </button>

          <div className="map-overlay bottom-bar">
            <TimeSlider
              captures={field.ndviHistory}
              index={idx}
              onChange={setSelectedCaptureIdx}
            />
          </div>
        </div>
      </div>
    </Shell>
  );
}
