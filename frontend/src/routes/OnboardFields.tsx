import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BaseMap from "../components/map/BaseMap";
import CandidatePolygons from "../components/map/CandidatePolygons";
import { detectFields } from "../lib/mock/crome";
import { ringAreaHa } from "../lib/geo";
import type { FieldFeature } from "../types";

const API = import.meta.env.VITE_API_URL || "http://localhost:9847";

export default function OnboardFields() {
  const navigate = useNavigate();
  const center = useMemo<[number, number]>(() => {
    const raw = sessionStorage.getItem("yieldmaxxing.onboard.center");
    return raw ? (JSON.parse(raw) as [number, number]) : [53.073, -0.302];
  }, []);

  const [candidates, setCandidates] = useState<FieldFeature[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const county = sessionStorage.getItem("yieldmaxxing.onboard.county") || "lincolnshire";
    fetch(`${API}/api/fields?lat=${center[0]}&lon=${center[1]}&radius_km=1&county=${county}&limit=200`)
      .then((r) => (r.ok ? r.json() : null))
      .then((geojson) => {
        if (geojson?.features?.length) {
          const mapped: FieldFeature[] = geojson.features.map((f: any) => ({
            type: "Feature",
            id: f.properties?.cromeid || f.id,
            geometry: f.geometry,
            properties: {
              CROMEID: f.properties?.cromeid || f.id || "",
              LUCODE: f.properties?.lucode || "AC01",
              REFDATE: "2025-06-15",
              PROB: f.properties?.prob || 0.9,
            },
          }));
          setCandidates(mapped);
          setSelected(new Set(mapped.slice(0, 5).map((c) => c.properties.CROMEID)));
        } else {
          const mock = detectFields(center[0], center[1], 7);
          setCandidates(mock);
          setSelected(new Set(mock.slice(0, 5).map((c) => c.properties.CROMEID)));
        }
      })
      .catch(() => {
        const mock = detectFields(center[0], center[1], 7);
        setCandidates(mock);
        setSelected(new Set(mock.slice(0, 5).map((c) => c.properties.CROMEID)));
      });
  }, [center]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalHa = useMemo(() => {
    let sum = 0;
    for (const c of candidates) {
      if (selected.has(c.properties.CROMEID)) {
        sum += ringAreaHa(c.geometry.coordinates[0]);
      }
    }
    return sum;
  }, [candidates, selected]);

  function onContinue() {
    const chosen = candidates.filter((c) =>
      selected.has(c.properties.CROMEID),
    );
    sessionStorage.setItem(
      "yieldmaxxing.onboard.selected",
      JSON.stringify(chosen),
    );
    navigate("/onboard/details");
  }

  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
      <div className="topbar">
        <button
          className="back"
          onClick={() => navigate("/onboard/address")}
        >
          ← Start over
        </button>
        <div className="logo">
          <span className="mark">🌾</span>
          <span>YieldMaxxing</span>
        </div>
        <div className="spacer" />
        <div className="user">Step 2 of 3 — Pick your fields</div>
      </div>
      <div style={{ height: "calc(100vh - 56px)", position: "relative" }}>
        <BaseMap center={center} zoom={14} flyToCenter={center} flyToZoom={14}>
          <CandidatePolygons
            candidates={candidates}
            selectedIds={selected}
            onToggle={toggle}
          />
        </BaseMap>
        <div className="onboard-footer">
          <div className="summary">
            <strong>{selected.size}</strong> fields selected ·{" "}
            <strong>{totalHa.toFixed(1)} ha</strong>
          </div>
          <button
            className="btn-primary"
            onClick={onContinue}
            disabled={selected.size === 0}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
