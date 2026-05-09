import type { NDVIStats } from "../../types";

interface Props {
  stats?: NDVIStats;
  title?: string;
}

export default function Legend({ stats, title = "NDVI" }: Props) {
  // Position markers for p10 / p90 on the gradient
  const p10pct = stats ? Math.max(0, Math.min(1, stats.p10)) * 100 : null;
  const p90pct = stats ? Math.max(0, Math.min(1, stats.p90)) * 100 : null;

  return (
    <div className="legend">
      <div className="title">{title}</div>
      <div className="bar">
        {p10pct !== null && (
          <div className="marker p10" style={{ left: `${p10pct}%` }} />
        )}
        {p90pct !== null && (
          <div className="marker p90" style={{ left: `${p90pct}%` }} />
        )}
      </div>
      <div className="scale">
        <span>0.0</span>
        <span>0.25</span>
        <span>0.5</span>
        <span>0.75</span>
        <span>1.0</span>
      </div>
      <div className="labels">
        <span>Bare soil</span>
        <span>Stressed</span>
        <span>Healthy</span>
      </div>
    </div>
  );
}
