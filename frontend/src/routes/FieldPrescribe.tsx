import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFarmStore } from "../store/farmStore";
import Shell from "../components/Shell";
import BaseMap from "../components/map/BaseMap";
import PrescriptionLayer from "../components/map/PrescriptionLayer";
import FertilizerPicker from "../components/controls/FertilizerPicker";
import { Polygon } from "react-leaflet";
import { ringToLatLngs } from "../lib/geo";
import { getGridCache } from "../lib/mock/farm";
import {
  buildPrescription,
  computeCostPreview,
  FERTILIZER_PRICE_USD_PER_TON,
  peakSummerCapture,
} from "../lib/mock/prescription";
import { generatePrescriptionZip, downloadBlob } from "../lib/isoxml";
import type { FertilizerProduct, Prescription } from "../types";

export default function FieldPrescribe() {
  const navigate = useNavigate();
  const { fieldId } = useParams();
  const farm = useFarmStore((s) => s.farm);

  const field = farm?.fields.find((f) => f.id === fieldId);
  const [product, setProduct] = useState<FertilizerProduct>(
    field?.fertilizer ?? "Urea (46-0-0)",
  );
  const [downloaded, setDownloaded] = useState(false);
  const [working, setWorking] = useState(false);

  const prescription = useMemo<Prescription | null>(() => {
    if (!field) return null;
    const grids = getGridCache(field.id);
    return buildPrescription(field, grids, product);
  }, [field, product]);

  const cost = useMemo(
    () => (field && prescription ? computeCostPreview(field, prescription) : null),
    [field, prescription],
  );

  useEffect(() => setDownloaded(false), [product]);

  if (!farm || !field) {
    navigate("/", { replace: true });
    return null;
  }

  async function send() {
    if (!prescription || !field) return;
    setWorking(true);
    const blob = await generatePrescriptionZip(field, prescription);
    downloadBlob(
      blob,
      `${farm!.id}-${field.slug}-prescription.zip`.replace(/\s+/g, "-").toLowerCase(),
    );
    setDownloaded(true);
    setWorking(false);
  }

  const peak = (() => {
    const grids = getGridCache(field.id);
    const c = peakSummerCapture(grids);
    return field.ndviHistory.find((h) => h.capturedAt === c.capturedAt) ?? field.ndviHistory[0];
  })();

  return (
    <Shell
      showBack
      backTo={`/field/${field.id}`}
      pageTitle="Fertilizer plan"
      breadcrumbs={[
        { label: "Farm Overview", to: "/farm" },
        { label: field.name, to: `/field/${field.id}` },
      ]}
    >
      <div className="map-page">
        <div className="sidebar">
          <div className="section-label">AI fertilizer plan</div>

          <div className="banner">
            <div className="tag">⚠ HORMUZ CRISIS</div>
            <div className="body">
              {product.split(" ")[0]} at{" "}
              <strong>${FERTILIZER_PRICE_USD_PER_TON[product]}/ton</strong> —
              variable-rate cuts your spend while protecting yield.
            </div>
          </div>

          <FertilizerPicker value={product} onChange={setProduct} />

          {prescription && (
            <div className="summary-card" style={{ marginTop: 8 }}>
              <div className="row">
                <span className="k">Peak NDVI date</span>
                <span className="v" style={{ fontSize: 12 }}>
                  {new Date(peak.capturedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="row">
                <span className="k">Total {product.split(" ")[0]}</span>
                <span className="v">{prescription.totalKg} kg</span>
              </div>
              <div className="row">
                <span className="k">Treated</span>
                <span className="v">{prescription.treatedHa} ha</span>
              </div>
              <div className="row">
                <span className="k">Skipped (healthy)</span>
                <span className="v">{prescription.skippedHa} ha</span>
              </div>
            </div>
          )}

          {cost && (
            <>
              <div className="section-label">Cost preview</div>
              <div className="summary-card">
                <div className="row">
                  <span className="k">Price</span>
                  <span className="v" style={{ fontSize: 12 }}>
                    ${cost.pricePerTon}/ton
                  </span>
                </div>
                <div className="row">
                  <span className="k">Variable-rate spend</span>
                  <span className="v">
                    ${cost.variableCostUsd.toLocaleString("en-US")}
                  </span>
                </div>
                <div
                  className="row"
                  title={`Blanket ${cost.uniformRateKgHa} kg/ha across ${field.areaHa} ha`}
                >
                  <span className="k">
                    Uniform spend ({cost.uniformRateKgHa} kg/ha)
                  </span>
                  <span
                    className="v"
                    style={{ color: "var(--text-2)", fontWeight: 500 }}
                  >
                    ${cost.uniformCostUsd.toLocaleString("en-US")}
                  </span>
                </div>
                <div className="row">
                  <span className="k" style={{ color: "#84cc16" }}>
                    You save
                  </span>
                  <span
                    className="v"
                    style={{ color: "#84cc16", fontSize: 16 }}
                  >
                    ${cost.savingUsd.toLocaleString("en-US")} (
                    {Math.round(cost.savingPct * 100)}%)
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="section-label">What you'll send</div>
          <div className="summary-card">
            <div className="row">
              <span className="k">File</span>
              <span className="v" style={{ fontSize: 11 }}>
                TASKDATA.zip (ISOXML 4.3)
              </span>
            </div>
            <div className="row">
              <span className="k">Compatible with</span>
              <span className="v" style={{ fontSize: 11 }}>
                {field.tractor}
              </span>
            </div>
            <div className="row">
              <span className="k">Grid</span>
              <span className="v" style={{ fontSize: 11 }}>
                8×8 zones, DDI 0006
              </span>
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={send}
            disabled={!prescription || working}
            style={{ marginTop: 16 }}
          >
            {downloaded
              ? "Downloaded ✓"
              : working
                ? "Building file…"
                : `Send to tractor →`}
          </button>
        </div>

        <div className="stage">
          <BaseMap center={field.centroid} zoom={16} fitBounds={field.bbox}>
            <Polygon
              positions={ringToLatLngs(field.feature.geometry.coordinates[0])}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                fill: false,
              }}
              interactive={false}
            />
            {prescription && (
              <PrescriptionLayer zones={prescription.zones.features} />
            )}
          </BaseMap>

          <div className="legend" style={{ width: 260 }}>
            <div className="title">Variable rate (kg/ha)</div>
            <div
              style={{
                display: "flex",
                gap: 6,
                marginTop: 4,
                fontSize: 11,
              }}
            >
              <span
                style={{
                  background: "#3f3f46",
                  color: "#fff",
                  padding: "2px 8px",
                  borderRadius: 999,
                  fontWeight: 700,
                }}
              >
                Skip
              </span>
              <span
                style={{
                  background: "#84cc16",
                  color: "#000",
                  padding: "2px 8px",
                  borderRadius: 999,
                  fontWeight: 700,
                }}
              >
                80
              </span>
              <span
                style={{
                  background: "#15803d",
                  color: "#fff",
                  padding: "2px 8px",
                  borderRadius: 999,
                  fontWeight: 700,
                }}
              >
                140
              </span>
            </div>
            <div className="labels" style={{ marginTop: 6 }}>
              <span>Healthy → no fertilizer</span>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
