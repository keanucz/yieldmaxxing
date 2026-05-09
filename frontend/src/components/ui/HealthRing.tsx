import { ndviToCSS } from "../../lib/ndvi";

interface Props {
  meanNDVI: number;
  label?: string;
}

export default function HealthRing({ meanNDVI, label = "Health" }: Props) {
  const pct = Math.max(0, Math.min(1, meanNDVI));
  const score = Math.round(pct * 100);
  const C = 2 * Math.PI * 26;
  const dash = C * pct;
  const color = ndviToCSS(meanNDVI);
  return (
    <div className="health-ring">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="6"
        />
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
          transform="rotate(-90 32 32)"
        />
      </svg>
      <div className="ring-text">
        <div className="ring-score">{score}</div>
        <div className="ring-label">{label}</div>
      </div>
    </div>
  );
}
