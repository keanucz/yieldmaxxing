import { Link, useNavigate } from "react-router-dom";
import { useFarmStore } from "../store/farmStore";

interface ShellProps {
  children: React.ReactNode;
  showBack?: boolean;
  backTo?: string;
  rightSlot?: React.ReactNode;
}

export default function Shell({ children, showBack, backTo, rightSlot }: ShellProps) {
  const navigate = useNavigate();
  const farm = useFarmStore((s) => s.farm);
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
          <span>CropGuard</span>
        </Link>
        <div className="spacer" />
        {rightSlot}
        {farm && <div className="user">{farm.ownerEmail}</div>}
      </div>
      {children}
    </div>
  );
}
