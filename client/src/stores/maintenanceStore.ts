import { create } from 'zustand';

interface MaintenanceState {
  active: boolean;
  setActive: (v: boolean) => void;
}

export const useMaintenanceStore = create<MaintenanceState>()((set) => ({
  active: false,
  setActive: (active) => set({ active }),
}));
