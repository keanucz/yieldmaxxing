import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ringAreaHa } from "../lib/geo";
import { buildFarmFromSelection } from "../lib/mock/farm";
import { useFarmStore } from "../store/farmStore";
import type {
  CropName,
  FertilizerProduct,
  FieldFeature,
  TractorModel,
} from "../types";

const CROPS: CropName[] = [
  "Corn (Zea mays)",
  "Winter wheat",
  "Spring barley",
  "Oilseed rape",
];
const FERTS: FertilizerProduct[] = [
  "Urea (46-0-0)",
  "CAN 27%N",
  "NPK 20-10-10",
  "UAN 28%",
];
const TRACTORS: TractorModel[] = [
  "John Deere 6R",
  "Fendt 700 Vario",
  "Case IH Magnum",
  "New Holland T7",
];

interface RowState {
  feature: FieldFeature;
  name: string;
  crop: CropName;
  fertilizer: FertilizerProduct;
  tractor: TractorModel;
}

const DEFAULT_NAMES = [
  "North Cobb",
  "South Meadow",
  "Long Acre",
  "Mill Piece",
  "Church Close",
  "Brook Field",
  "Far Pasture",
];

export default function OnboardDetails() {
  const navigate = useNavigate();
  const setFarm = useFarmStore((s) => s.setFarm);
  const setOnboarded = useFarmStore((s) => s.setOnboarded);

  const initial = useMemo<RowState[]>(() => {
    const raw = sessionStorage.getItem("cropguard.onboard.selected");
    if (!raw) return [];
    const features = JSON.parse(raw) as FieldFeature[];
    return features.map((f, i) => ({
      feature: f,
      name: DEFAULT_NAMES[i] ?? `Field ${i + 1}`,
      crop: defaultCropFor(f),
      fertilizer: "Urea (46-0-0)",
      tractor: "John Deere 6R",
    }));
  }, []);

  const [rows, setRows] = useState<RowState[]>(initial);
  const [saving, setSaving] = useState(false);

  function update(i: number, patch: Partial<RowState>) {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  async function save() {
    setSaving(true);
    const centerRaw = sessionStorage.getItem("cropguard.onboard.center");
    const center: [number, number] = centerRaw
      ? (JSON.parse(centerRaw) as [number, number])
      : [53.073, -0.302];
    const farm = await buildFarmFromSelection({
      centroid: center,
      ownerEmail: "you@yourfarm.uk",
      selections: rows,
    });
    setFarm(farm);
    setOnboarded(true);
    sessionStorage.removeItem("cropguard.onboard.selected");
    navigate("/farm");
  }

  if (rows.length === 0) {
    return (
      <div className="onboard-stage">
        <div className="onboard-card">
          <h1>No fields selected</h1>
          <p>Go back and pick at least one.</p>
          <button
            className="btn-primary"
            onClick={() => navigate("/onboard/fields")}
          >
            ← Back to map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboard-stage">
      <div className="onboard-card" style={{ maxWidth: 700 }}>
        <div className="progress">
          <span className="active" />
          <span className="active" />
          <span className="active" />
        </div>
        <h1>Tell us about your fields</h1>
        <p>
          Quick details so we can tailor satellite analysis and fertilizer
          plans.
        </p>
        <div className="fields-grid">
          {rows.map((r, i) => {
            const ha = ringAreaHa(r.feature.geometry.coordinates[0]).toFixed(
              1,
            );
            return (
              <div className="field-card" key={r.feature.properties.CROMEID}>
                <div className="header">
                  <input
                    className="name-input"
                    value={r.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                  />
                  <div className="area">{ha} ha</div>
                </div>
                <div className="grid3">
                  <div className="field-stack">
                    <label>Crop</label>
                    <select
                      value={r.crop}
                      onChange={(e) =>
                        update(i, { crop: e.target.value as CropName })
                      }
                    >
                      {CROPS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field-stack">
                    <label>Fertilizer</label>
                    <select
                      value={r.fertilizer}
                      onChange={(e) =>
                        update(i, {
                          fertilizer: e.target.value as FertilizerProduct,
                        })
                      }
                    >
                      {FERTS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field-stack">
                    <label>Tractor</label>
                    <select
                      value={r.tractor}
                      onChange={(e) =>
                        update(i, { tractor: e.target.value as TractorModel })
                      }
                    >
                      {TRACTORS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Building your farm…" : "Save & continue →"}
        </button>
      </div>
    </div>
  );
}

function defaultCropFor(f: FieldFeature): CropName {
  switch (f.properties.LUCODE) {
    case "AC05":
      return "Corn (Zea mays)";
    case "AC02":
      return "Spring barley";
    case "AC01":
      return "Winter wheat";
    case "AC06":
      return "Oilseed rape";
    default:
      return "Corn (Zea mays)";
  }
}
