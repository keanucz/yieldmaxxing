import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Farm } from "../types";

interface FarmStore {
  farm: Farm | null;
  onboarded: boolean;
  loggedIn: boolean;
  loginEmail: string | null;
  selectedFieldId: string | null;
  selectedCaptureIdx: number;
  // True after we've re-rendered NDVI blob URLs after rehydrate. Persisted
  // blob URLs are dead, so they need re-rendering.
  blobsHydrated: boolean;

  setFarm: (farm: Farm) => void;
  setOnboarded: (b: boolean) => void;
  login: (email: string) => void;
  logout: () => void;
  setSelectedField: (id: string | null) => void;
  setSelectedCaptureIdx: (idx: number) => void;
  markBlobsHydrated: () => void;
  reset: () => void;
}

export const useFarmStore = create<FarmStore>()(
  persist(
    (set) => ({
      farm: null,
      onboarded: false,
      loggedIn: false,
      loginEmail: null,
      selectedFieldId: null,
      selectedCaptureIdx: 0,
      blobsHydrated: false,
      setFarm: (farm) =>
        set((s) => ({
          farm,
          selectedFieldId: s.selectedFieldId ?? farm.fields[0]?.id ?? null,
          selectedCaptureIdx: clampCapture(farm, s.selectedCaptureIdx),
          blobsHydrated: true,
        })),
      setOnboarded: (b) => set({ onboarded: b }),
      login: (email) => set({ loggedIn: true, loginEmail: email }),
      logout: () => set({ loggedIn: false, loginEmail: null }),
      setSelectedField: (id) => set({ selectedFieldId: id }),
      setSelectedCaptureIdx: (idx) => set({ selectedCaptureIdx: idx }),
      markBlobsHydrated: () => set({ blobsHydrated: true }),
      reset: () =>
        set({
          farm: null,
          onboarded: false,
          loggedIn: false,
          loginEmail: null,
          selectedFieldId: null,
          selectedCaptureIdx: 0,
          blobsHydrated: false,
        }),
    }),
    {
      name: "cropguard.farm.v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        farm: s.farm,
        onboarded: s.onboarded,
        loggedIn: s.loggedIn,
        loginEmail: s.loginEmail,
        selectedFieldId: s.selectedFieldId,
        selectedCaptureIdx: s.selectedCaptureIdx,
      }),
      onRehydrateStorage: () => (state) => {
        // Mark blobs as needing re-render after refresh.
        if (state) state.blobsHydrated = false;
      },
    },
  ),
);

function clampCapture(farm: Farm, idx: number): number {
  const f = farm.fields[0];
  if (!f) return 0;
  return Math.max(0, Math.min(f.ndviHistory.length - 1, idx));
}
