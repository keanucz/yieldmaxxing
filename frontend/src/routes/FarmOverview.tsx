import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFarmStore } from "../store/farmStore";
import Shell from "../components/Shell";
import BaseMap from "../components/map/BaseMap";
import FieldPolygonsLayer from "../components/map/FieldPolygonsLayer";
import FieldShape from "../components/ui/FieldShape";
import { ndviToCSS } from "../lib/ndvi";
import type { Farm, Field } from "../types";

type SortKey =
  | "number"
  | "name"
  | "areaHa"
  | "crop"
  | "stage"
  | "harvest"
  | "yield"
  | "health";
type SortDir = "asc" | "desc";

export default function FarmOverview() {
  const navigate = useNavigate();
  const farm = useFarmStore((s) => s.farm);
  const [sortKey, setSortKey] = useState<SortKey>("number");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [hoverFieldId, setHoverFieldId] = useState<string | null>(null);

  if (!farm) {
    navigate("/", { replace: true });
    return null;
  }

  function open(id: string) {
    useFarmStore.getState().setSelectedField(id);
    navigate(`/field/${id}`);
  }

  const totals = useMemo(() => computeTotals(farm), [farm]);
  const bbox = useMemo(() => farmBbox(farm), [farm]);
  const sorted = useMemo(
    () => sortFields(farm.fields, sortKey, sortDir),
    [farm.fields, sortKey, sortDir],
  );

  function setSort(key: SortKey) {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <Shell pageTitle="Farm Overview">
      <div className="farm-overview-v2">
        <FarmTopHeader farm={farm} totals={totals} />

        <div className="overview-split">
          <div className="overview-left">
            <div className="map-wrap">
              <BaseMap center={farm.centroid} zoom={13} fitBounds={bbox}>
                <FieldPolygonsLayer
                  fields={farm.fields}
                  onClick={open}
                  highlightedId={hoverFieldId}
                />
              </BaseMap>
            </div>
            <div className="legend-strip">
              <div className="title">Field health (mean NDVI)</div>
              <div className="bar" />
              <div className="ticks">
                <span>Stressed</span>
                <span>Mid</span>
                <span>Healthy</span>
              </div>
            </div>
          </div>

          <div className="overview-right">
            <div className="table-toolbar">
              <div className="title">
                <span className="big">Field list</span>
                <span className="dim">
                  {farm.fields.length} fields · {totals.totalHa} ha
                </span>
              </div>
              <div className="actions">
                <button className="btn-secondary tiny" type="button" disabled>
                  + Add field
                </button>
                <button className="btn-secondary tiny" type="button" disabled>
                  Export
                </button>
              </div>
            </div>

            <div className="fmis-table-scroll">
              <table className="fmis-table">
                <thead>
                  <tr>
                    <Th col="number" {...{ sortKey, sortDir, setSort }}>
                      No.
                    </Th>
                    <th>Shape</th>
                    <Th col="name" {...{ sortKey, sortDir, setSort }}>
                      Field
                    </Th>
                    <Th col="areaHa" {...{ sortKey, sortDir, setSort }}>
                      Size
                    </Th>
                    <Th col="crop" {...{ sortKey, sortDir, setSort }}>
                      Crop / Variety
                    </Th>
                    <th>Previous</th>
                    <Th col="stage" {...{ sortKey, sortDir, setSort }}>
                      Stage
                    </Th>
                    <Th col="harvest" {...{ sortKey, sortDir, setSort }}>
                      Harvest
                    </Th>
                    <Th col="yield" {...{ sortKey, sortDir, setSort }}>
                      Yield
                    </Th>
                    <th>Soil</th>
                    <Th col="health" {...{ sortKey, sortDir, setSort }}>
                      NDVI
                    </Th>
                    <th>Last activity</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((f, i) => (
                    <FieldRow
                      key={f.id}
                      n={i + 1}
                      field={f}
                      onOpen={() => open(f.id)}
                      onHover={(hovering) =>
                        setHoverFieldId(hovering ? f.id : null)
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

interface Totals {
  totalHa: number;
  cropMix: Array<{ crop: string; ha: number; pct: number }>;
  tractors: Array<{ name: string; count: number }>;
  avgHealth: number;
  expectedYieldT: number;
}

function computeTotals(farm: Farm): Totals {
  const totalHa = farm.fields.reduce((a, f) => a + f.areaHa, 0);
  const cropAcc = new Map<string, number>();
  const tractorAcc = new Map<string, number>();
  let healthSum = 0;
  let healthN = 0;
  let yieldT = 0;
  for (const f of farm.fields) {
    cropAcc.set(f.crop, (cropAcc.get(f.crop) ?? 0) + f.areaHa);
    tractorAcc.set(f.tractor, (tractorAcc.get(f.tractor) ?? 0) + 1);
    const peak = pickPeak(f);
    healthSum += peak;
    healthN += 1;
    yieldT += f.expectedYieldTHa * f.areaHa;
  }
  const cropMix = [...cropAcc.entries()]
    .map(([crop, ha]) => ({
      crop,
      ha: round1(ha),
      pct: Math.round((ha / totalHa) * 100),
    }))
    .sort((a, b) => b.ha - a.ha);
  const tractors = [...tractorAcc.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  return {
    totalHa: round1(totalHa),
    cropMix,
    tractors,
    avgHealth: healthN ? healthSum / healthN : 0,
    expectedYieldT: Math.round(yieldT),
  };
}

function FarmTopHeader({ farm, totals }: { farm: Farm; totals: Totals }) {
  return (
    <div className="farm-top-header">
      <div className="left-cluster">
        <div className="brand-line">
          <h1>{farm.name}</h1>
          <span className="badge">{farm.farmType}</span>
        </div>
        <div className="meta-line">
          <span>📍 {formatAddress(farm.address, farm.region)}</span>
          <span className="dot-sep">·</span>
          <span>Est. {farm.establishedYear}</span>
          <span className="dot-sep">·</span>
          <span>👤 {farm.ownerName}</span>
        </div>
      </div>

      <div className="kpi-strip">
        <Kpi label="Total area" value={`${totals.totalHa} ha`} />
        <Kpi label="Fields" value={String(farm.fields.length)} />
        <Kpi
          label="Avg health"
          value={
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: ndviToCSS(totals.avgHealth),
                  display: "inline-block",
                }}
              />
              {totals.avgHealth.toFixed(2)}
            </span>
          }
        />
        <Kpi
          label="Crop mix"
          value={
            <span className="mix-pills">
              {totals.cropMix.slice(0, 3).map((c) => (
                <span className="mix-pill" key={c.crop} title={c.crop}>
                  {shortCrop(c.crop)} {c.pct}%
                </span>
              ))}
            </span>
          }
        />
        <Kpi
          label="Machinery"
          value={
            <span className="mix-pills">
              {totals.tractors.slice(0, 2).map((t) => (
                <span className="mix-pill machinery" key={t.name}>
                  🚜 {shortTractor(t.name)} ×{t.count}
                </span>
              ))}
            </span>
          }
        />
        <Kpi
          label="Expected harvest"
          value={`${totals.expectedYieldT} t`}
          sub="all fields"
        />
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

function Th({
  col,
  sortKey,
  sortDir,
  setSort,
  children,
}: {
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  setSort: (k: SortKey) => void;
  children: React.ReactNode;
}) {
  const active = sortKey === col;
  return (
    <th
      className={`sortable ${active ? "active" : ""}`}
      onClick={() => setSort(col)}
    >
      <span>{children}</span>
      <span className="sort-ico">
        {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </th>
  );
}

function FieldRow({
  n,
  field,
  onOpen,
  onHover,
}: {
  n: number;
  field: Field;
  onOpen: () => void;
  onHover: (hovering: boolean) => void;
}) {
  const peak = pickPeak(field);
  const dot = ndviToCSS(peak);
  return (
    <tr
      onClick={onOpen}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className="row"
    >
      <td className="num">{n}</td>
      <td className="shape-cell">
        <FieldShape field={field} size={32} />
      </td>
      <td className="name-cell">
        <div className="name">{field.name}</div>
        <div className="dim">{field.feature.properties.CROMEID}</div>
      </td>
      <td className="num">{field.areaHa}</td>
      <td className="crop-cell">
        <div className="crop">
          <span className="crop-tag">{cropTag(field.crop)}</span>{" "}
          {shortCrop(field.crop)}
        </div>
        <div className="dim">{field.variety}</div>
      </td>
      <td className="dim">{field.previousCrop}</td>
      <td>{field.growthStage}</td>
      <td>{formatShortDate(field.expectedHarvestDate)}</td>
      <td className="num">
        <span className="strong">{field.expectedYieldTHa}</span>{" "}
        <span className="dim">t/ha</span>
      </td>
      <td>
        <div className="soil">
          <span>{field.soilType ?? "—"}</span>
          {field.soilPh != null && (
            <span className="dim small"> pH {field.soilPh}</span>
          )}
        </div>
      </td>
      <td>
        <div className="health-cell">
          <span className="dot" style={{ background: dot }} />
          <span>{peak.toFixed(2)}</span>
        </div>
      </td>
      <td className="last-cell">
        {field.lastActivity ? (
          <>
            <div className="last-line">
              <span className="last-kind">{field.lastActivity.kind}</span>
              <span className="last-date">
                {formatShortDate(field.lastActivity.date)}
              </span>
            </div>
            <div className="dim small last-detail">
              {field.lastActivity.detail}
            </div>
          </>
        ) : (
          <span className="dim small">—</span>
        )}
      </td>
      <td className="row-action">›</td>
    </tr>
  );
}

function sortFields(
  fields: Field[],
  key: SortKey,
  dir: SortDir,
): Field[] {
  const copy = [...fields];
  copy.sort((a, b) => {
    const v = compareField(a, b, key);
    return dir === "asc" ? v : -v;
  });
  return copy;
}

function compareField(a: Field, b: Field, key: SortKey): number {
  switch (key) {
    case "number":
      return a.id.localeCompare(b.id);
    case "name":
      return a.name.localeCompare(b.name);
    case "areaHa":
      return a.areaHa - b.areaHa;
    case "crop":
      return a.crop.localeCompare(b.crop);
    case "stage":
      return a.growthStage.localeCompare(b.growthStage);
    case "harvest":
      return a.expectedHarvestDate.localeCompare(b.expectedHarvestDate);
    case "yield":
      return a.expectedYieldTHa - b.expectedYieldTHa;
    case "health":
      return pickPeak(a) - pickPeak(b);
  }
}

function pickPeak(f: Field): number {
  let best = f.ndviHistory[0]?.ndviStats.mean ?? 0;
  for (const c of f.ndviHistory) if (c.ndviStats.mean > best) best = c.ndviStats.mean;
  return best;
}

function farmBbox(farm: Farm): [number, number, number, number] {
  let west = Infinity,
    south = Infinity,
    east = -Infinity,
    north = -Infinity;
  for (const f of farm.fields) {
    const [w, s, e, n] = f.bbox;
    if (w < west) west = w;
    if (s < south) south = s;
    if (e > east) east = e;
    if (n > north) north = n;
  }
  return [west, south, east, north];
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function shortCrop(crop: string): string {
  if (crop.startsWith("Corn")) return "Corn";
  if (crop.startsWith("Winter wheat")) return "W. wheat";
  if (crop.startsWith("Spring barley")) return "S. barley";
  if (crop.startsWith("Oilseed rape")) return "OSR";
  return crop;
}

function cropTag(crop: string): string {
  // FMIS-style 2-letter tag: HF (main), GL (grass), ZF (cover)
  // All our demo crops are main crops.
  if (crop.includes("grass")) return "GL";
  if (crop.toLowerCase().includes("cover")) return "ZF";
  return "HF";
}

function shortTractor(name: string): string {
  return name.replace(/\s+(\d.*)$/, " $1");
}

function formatAddress(address: string, region: string): string {
  if (!address || address === "—") return region;
  if (address.toLowerCase().includes(region.toLowerCase())) return address;
  return `${address}, ${region}`;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
