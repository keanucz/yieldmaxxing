import type { FertilizerProduct } from "../../types";

const ALL: FertilizerProduct[] = [
  "Urea (46-0-0)",
  "CAN 27%N",
  "NPK 20-10-10",
  "UAN 28%",
];

interface Props {
  value: FertilizerProduct;
  onChange: (v: FertilizerProduct) => void;
}

export default function FertilizerPicker({ value, onChange }: Props) {
  return (
    <div className="field-stack">
      <label>Fertilizer product</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as FertilizerProduct)}
      >
        {ALL.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </div>
  );
}
