import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { geocode } from "../lib/geocode";

export default function OnboardAddress() {
  const navigate = useNavigate();
  const [value, setValue] = useState("Anwick, Lincolnshire");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const hit = await geocode(value);
    setLoading(false);
    if (!hit) {
      setErr("Couldn't find that address. Try a UK postcode or town name.");
      return;
    }
    sessionStorage.setItem(
      "cropguard.onboard.center",
      JSON.stringify([hit.lat, hit.lng]),
    );
    sessionStorage.setItem("cropguard.onboard.address", hit.display_name);
    navigate("/onboard/fields");
  }

  return (
    <div className="onboard-stage">
      <form className="onboard-card" onSubmit={submit}>
        <div className="progress">
          <span className="active" />
          <span />
          <span />
        </div>
        <h1>Where's your farm?</h1>
        <p>
          We'll detect your fields from the UK Crop Map and pull satellite
          imagery from the past year.
        </p>
        <input
          className="big-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Town, postcode, or farm name"
          autoFocus
        />
        {err && (
          <div style={{ color: "#f87171", fontSize: 13, marginTop: 8 }}>
            {err}
          </div>
        )}
        <div style={{ height: 20 }} />
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Looking…" : "Find my farm →"}
        </button>
        <div style={{ marginTop: 14, fontSize: 11, color: "#666" }}>
          Try “Anwick, Lincolnshire” for the demo.
        </div>
      </form>
    </div>
  );
}
