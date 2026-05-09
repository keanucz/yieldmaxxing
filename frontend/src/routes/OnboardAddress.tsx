import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { geocode } from "../lib/geocode";

export default function OnboardAddress() {
  const navigate = useNavigate();
  const [value, setValue] = useState("Anwick, Lincolnshire");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const API = import.meta.env.VITE_API_URL || "http://localhost:9847";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    // Try Go API geocode first (returns county for CROME lookup)
    try {
      const resp = await fetch(`${API}/api/geocode?postcode=${encodeURIComponent(value.trim())}`);
      if (resp.ok) {
        const data = await resp.json();
        sessionStorage.setItem("yieldmaxxing.onboard.center", JSON.stringify([data.lat, data.lon]));
        sessionStorage.setItem("yieldmaxxing.onboard.address", `${data.postcode}, ${data.county || data.district}`);
        sessionStorage.setItem("yieldmaxxing.onboard.county", (data.county || data.district || "").toLowerCase());
        setLoading(false);
        navigate("/onboard/fields");
        return;
      }
    } catch { /* fall through */ }

    // Fallback to Nominatim
    const hit = await geocode(value);
    setLoading(false);
    if (!hit) {
      setErr("Couldn't find that address. Try a UK postcode or town name.");
      return;
    }
    sessionStorage.setItem("yieldmaxxing.onboard.center", JSON.stringify([hit.lat, hit.lng]));
    sessionStorage.setItem("yieldmaxxing.onboard.address", hit.display_name);
    sessionStorage.setItem("yieldmaxxing.onboard.county", "lincolnshire");
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
