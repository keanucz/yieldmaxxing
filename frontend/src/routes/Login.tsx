import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFarmStore } from "../store/farmStore";

export default function Login() {
  const navigate = useNavigate();
  const login = useFarmStore((s) => s.login);
  const onboarded = useFarmStore((s) => s.onboarded);
  const [email, setEmail] = useState("fede@manorfarm.uk");
  const [password, setPassword] = useState("••••••••");
  const [busy, setBusy] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    setTimeout(() => {
      login(email);
      navigate(onboarded ? "/farm" : "/onboard/address", { replace: true });
    }, 350);
  }

  return (
    <div className="login-stage">
      <div className="login-split">
        <div className="login-hero">
          <div className="hero-brand">
            <img src="/logo.png" alt="" />
            <span>YieldMaxxing</span>
          </div>
          <div className="hero-tag">Precision agronomy for arable farms</div>
          <ul className="hero-bullets">
            <li>
              <span className="b">Sentinel-2 NDVI</span>
              <span className="d">field-level health, refreshed every pass</span>
            </li>
            <li>
              <span className="b">Variable-rate planning</span>
              <span className="d">ISOXML files compatible with your tractor</span>
            </li>
            <li>
              <span className="b">AI agronomist</span>
              <span className="d">photo-to-diagnosis stress detection</span>
            </li>
          </ul>
          <div className="hero-trust">
            Trusted by 1,200+ growers across the UK and EU.
          </div>
        </div>

        <form className="login-card" onSubmit={submit}>
          <h1>Sign in</h1>
          <p>Welcome back. Enter your details to access your farm dashboard.</p>

          <div className="field-stack">
            <label>Email address</label>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourfarm.uk"
              required
            />
          </div>

          <div className="field-stack">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="login-row">
            <label className="checkrow">
              <input type="checkbox" defaultChecked /> Keep me signed in
            </label>
            <a href="#" onClick={(e) => e.preventDefault()}>
              Forgot password?
            </a>
          </div>

          <button className="btn-primary" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in →"}
          </button>

          <div className="login-foot">
            New to YieldMaxxing?{" "}
            <a href="#" onClick={(e) => e.preventDefault()}>
              Request a demo
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
