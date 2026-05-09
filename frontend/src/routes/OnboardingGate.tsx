import { Navigate } from "react-router-dom";
import { useFarmStore } from "../store/farmStore";

export default function OnboardingGate() {
  const onboarded = useFarmStore((s) => s.onboarded);
  return <Navigate to={onboarded ? "/farm" : "/onboard/address"} replace />;
}
