import { create } from 'zustand';
import type { PlatformConfig } from '@/services/platformConfigService';

interface PlatformConfigState {
  config: PlatformConfig | null;
  setConfig: (config: PlatformConfig) => void;
}

export const usePlatformConfigStore = create<PlatformConfigState>()((set) => ({
  config: null,
  setConfig: (config) => set({ config }),
}));
