import type { Field } from "../../types";
import { ndviToCSS } from "../../lib/ndvi";

interface Props {
  fields: Field[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}

export default function FieldList({ fields, selectedId, onSelect }: Props) {
  return (
    <div className="field-list">
      {fields.map((f) => {
        const latest = f.ndviHistory[f.ndviHistory.length - 1];
        const summer = pickPeak(f);
        const dotColor = ndviToCSS(summer?.ndviStats.mean ?? latest?.ndviStats.mean ?? 0.5);
        return (
          <div
            key={f.id}
            className={`item ${selectedId === f.id ? "selected" : ""}`}
            onClick={() => onSelect(f.id)}
          >
            <div className="health-dot" style={{ background: dotColor }} />
            <div>
              <div className="name">{f.name}</div>
              <div className="meta">
                {f.crop.split(" ")[0]} · {f.fertilizer}
              </div>
            </div>
            <div className="area">{f.areaHa} ha</div>
          </div>
        );
      })}
    </div>
  );
}

function pickPeak(f: Field) {
  let best = f.ndviHistory[0];
  for (const c of f.ndviHistory) if (c.ndviStats.mean > best.ndviStats.mean) best = c;
  return best;
}
