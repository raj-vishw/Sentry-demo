import { create } from 'zustand';

interface SetupState {
  /** null = not yet checked. Resolved once by AuthGate on boot. */
  needsSetup: boolean | null;
  setNeedsSetup: (v: boolean) => void;
}

export const useSetupStore = create<SetupState>()((set) => ({
  needsSetup: null,
  setNeedsSetup: (needsSetup) => set({ needsSetup }),
}));
