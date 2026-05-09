import { Navigate } from "react-router-dom";
import { useFarmStore } from "../store/farmStore";

export default function OnboardingGate() {
  const loggedIn = useFarmStore((s) => s.loggedIn);
  const onboarded = useFarmStore((s) => s.onboarded);
  if (!loggedIn) return <Navigate to="/login" replace />;
  return <Navigate to={onboarded ? "/farm" : "/onboard/address"} replace />;
}
