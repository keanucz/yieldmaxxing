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
    <Shell
      showBack
      backTo="/farm"
      pageTitle={field.name}
      breadcrumbs={[{ label: "Farm Overview", to: "/farm" }]}
    >
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
              <div className="label">Variety</div>
              <div className="value" style={{ fontSize: 12 }}>
                {field.variety}
              </div>
            </div>
            <div className="stat">
              <div className="label">Stage</div>
              <div className="value" style={{ fontSize: 13 }}>
                {field.growthStage}
              </div>
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

          <div className="section-label">Season plan</div>
          <div className="summary-card">
            <div className="row">
              <span className="k">Sown</span>
              <span className="v">{field.plantedDate}</span>
            </div>
            <div className="row">
              <span className="k">Sowing rate</span>
              <span className="v">{field.sowingRateKgHa} kg/ha</span>
            </div>
            <div className="row">
              <span className="k">Expected harvest</span>
              <span className="v">
                {new Date(field.expectedHarvestDate).toLocaleDateString(
                  "en-GB",
                  { day: "numeric", month: "short", year: "numeric" },
                )}
              </span>
            </div>
            <div className="row">
              <span className="k">Yield estimate</span>
              <span className="v">{field.expectedYieldTHa} t/ha</span>
            </div>
            <div className="row">
              <span className="k">Previous crop</span>
              <span className="v">{field.previousCrop}</span>
            </div>
          </div>

          <div className="section-label">Soil</div>
          <div className="summary-card">
            <div className="row">
              <span className="k">Type</span>
              <span className="v">{field.soilType}</span>
            </div>
            <div className="row">
              <span className="k">pH</span>
              <span className="v">{field.soilPh}</span>
            </div>
            <div className="row">
              <span className="k">Organic matter</span>
              <span className="v">{field.organicMatterPct}%</span>
            </div>
          </div>

          {field.lastActivity && (
            <>
              <div className="section-label">Last activity</div>
              <div className="summary-card">
                <div className="row">
                  <span className="k">
                    {new Date(field.lastActivity.date).toLocaleDateString(
                      "en-GB",
                      { day: "numeric", month: "short" },
                    )}
                  </span>
                  <span className="v" style={{ fontSize: 12 }}>
                    {field.lastActivity.kind}
                  </span>
                </div>
                <div className="row">
                  <span className="k" style={{ fontSize: 11 }}>
                    {field.lastActivity.detail}
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="section-label">Health snapshot</div>
          <div className="summary-card">
            <div className="row">
              <span className="k">Strongest area</span>
              <span className="v">{healthLabel(cap.ndviStats.p90)}</span>
            </div>
            <div className="row">
              <span className="k">Weakest area</span>
              <span className="v">{healthLabel(cap.ndviStats.p10)}</span>
            </div>
            <div className="row">
              <span className="k">Image quality</span>
              <span className="v">{imageQualityLabel(cap.cloudCoverPct)}</span>
            </div>
          </div>

          <div
            className="field-record-foot"
            style={{
              fontSize: 10,
              opacity: 0.5,
              marginTop: 8,
              letterSpacing: 0.3,
            }}
          >
            Field ref · {field.feature.properties.CROMEID}
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

          <Legend stats={cap.ndviStats} title="Field health" />

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

function healthLabel(ndvi: number): string {
  if (ndvi >= 0.7) return "Vigorous";
  if (ndvi >= 0.55) return "Healthy";
  if (ndvi >= 0.4) return "Average";
  if (ndvi >= 0.25) return "Stressed";
  return "Bare / poor";
}

function imageQualityLabel(cloudPct: number): string {
  if (cloudPct < 5) return "Clear";
  if (cloudPct < 20) return "Mostly clear";
  if (cloudPct < 50) return "Partly cloudy";
  return "Cloudy";
}
