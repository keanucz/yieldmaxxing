import { create } from "zustand";

interface UIStore {
  showYieldZones: boolean;
  setShowYieldZones: (v: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  showYieldZones: false,
  setShowYieldZones: (v) => set({ showYieldZones: v }),
}));
