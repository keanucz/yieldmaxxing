import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { useFarmStore } from "./store/farmStore";
import { rehydrateBlobs } from "./lib/mock/farm";
import OnboardingGate from "./routes/OnboardingGate";
import OnboardAddress from "./routes/OnboardAddress";
import OnboardFields from "./routes/OnboardFields";
import OnboardDetails from "./routes/OnboardDetails";
import FarmOverview from "./routes/FarmOverview";
import FieldDetail from "./routes/FieldDetail";
import FieldPrescribe from "./routes/FieldPrescribe";

export default function App() {
  const farm = useFarmStore((s) => s.farm);
  const blobsHydrated = useFarmStore((s) => s.blobsHydrated);
  const setFarm = useFarmStore((s) => s.setFarm);

  // After persist rehydrate, blob: URLs from the previous tab are dead. Rebuild.
  useEffect(() => {
    if (farm && !blobsHydrated) {
      rehydrateBlobs(farm).then((rebuilt) => setFarm({ ...rebuilt }));
    }
  }, [farm, blobsHydrated, setFarm]);

  // Reset shortcut for demo recovery
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.shiftKey && (e.key === "R" || e.key === "r") && e.metaKey === false && e.ctrlKey === false) {
        if (confirm("Reset CropGuard demo state?")) {
          useFarmStore.getState().reset();
          localStorage.removeItem("cropguard.farm.v1");
          location.href = "/";
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Routes>
      <Route path="/" element={<OnboardingGate />} />
      <Route path="/onboard/address" element={<OnboardAddress />} />
      <Route path="/onboard/fields" element={<OnboardFields />} />
      <Route path="/onboard/details" element={<OnboardDetails />} />
      <Route path="/farm" element={<FarmOverview />} />
      <Route path="/field/:fieldId" element={<FieldDetail />} />
      <Route path="/field/:fieldId/prescribe" element={<FieldPrescribe />} />
    </Routes>
  );
}
