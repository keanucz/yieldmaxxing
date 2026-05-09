import { Link, useNavigate } from "react-router-dom";
import { useFarmStore } from "../store/farmStore";

interface ShellProps {
  children: React.ReactNode;
  showBack?: boolean;
  backTo?: string;
  rightSlot?: React.ReactNode;
  pageTitle?: string;
  breadcrumbs?: Array<{ label: string; to?: string }>;
}

export default function Shell({
  children,
  showBack,
  backTo,
  rightSlot,
  pageTitle,
  breadcrumbs,
}: ShellProps) {
  const navigate = useNavigate();
  const farm = useFarmStore((s) => s.farm);
  const loginEmail = useFarmStore((s) => s.loginEmail);
  const logout = useFarmStore((s) => s.logout);
  function onLogout() {
    logout();
    navigate("/login", { replace: true });
  }
  return (
    <div className="app-shell">
      <div className="topbar">
        {showBack && (
          <button
            className="back"
            onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
          >
            ← Back
          </button>
        )}
        <Link to="/farm" className="logo" style={{ color: "inherit" }}>
          <img className="mark" src="/logo.png" alt="" />
          <span>YieldMaxxing</span>
        </Link>
        {(pageTitle || breadcrumbs?.length) && (
          <div className="page-crumb">
            <span className="sep">/</span>
            {breadcrumbs?.map((b, i) => (
              <span key={i} className="crumb">
                {b.to ? (
                  <Link to={b.to} className="crumb-link">
                    {b.label}
                  </Link>
                ) : (
                  <span className="crumb-dim">{b.label}</span>
                )}
                <span className="sep">/</span>
              </span>
            ))}
            {pageTitle && <span className="page-title">{pageTitle}</span>}
          </div>
        )}
        <div className="spacer" />
        {rightSlot}
        {(loginEmail || farm) && (
          <div className="user-pill">
            <span className="user-email">{loginEmail ?? farm?.ownerEmail}</span>
            <button className="logout" onClick={onLogout} title="Sign out">
              ↩
            </button>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
