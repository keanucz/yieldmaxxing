import type { NDVICapture } from "../../types";

interface Props {
  captures: NDVICapture[];
  index: number;
  onChange: (idx: number) => void;
}

export default function TimeSlider({ captures, index, onChange }: Props) {
  const cap = captures[index];
  const date = cap ? formatDate(cap.capturedAt) : "—";
  const cloud = cap?.cloudCoverPct ?? 0;
  return (
    <div className="time-slider">
      <div className="row">
        <div className="date">{date}</div>
        <div className={`cloud ${cloud > 30 ? "high" : ""}`}>
          ☁ {cloud}% cloud
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: "#888" }}>
          {index + 1} / {captures.length}
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(0, captures.length - 1)}
        step={1}
        value={index}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
      />
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
