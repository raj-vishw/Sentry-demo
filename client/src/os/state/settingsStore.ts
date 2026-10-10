import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WallpaperId = 'observatory' | 'aurora' | 'minimal' | 'matrix' | 'terminal' | 'nebula' | 'void';
export type AccentId = 'signal' | 'discovery' | 'amber';
export type ThemeMode = 'dark' | 'light';

export const ACCENT_VALUES: Record<AccentId, string> = {
  signal: '#00e5ff',
  discovery: '#d946ef',
  amber: '#ffb020',
};

interface SettingsState {
  theme: ThemeMode;
  wallpaper: WallpaperId;
  accent: AccentId;
  density: 'comfortable' | 'compact';
  /** null = follow the OS-level prefers-reduced-motion setting. */
  reduceMotion: boolean | null;
  clockFormat: '24h' | '12h';
  dockAutohide: boolean;
  bootSeen: boolean;
  setTheme: (t: ThemeMode) => void;
  setWallpaper: (w: WallpaperId) => void;
  setAccent: (a: AccentId) => void;
  setDensity: (d: 'comfortable' | 'compact') => void;
  setReduceMotion: (v: boolean | null) => void;
  setClockFormat: (f: '24h' | '12h') => void;
  setDockAutohide: (v: boolean) => void;
  markBootSeen: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      wallpaper: 'observatory',
      accent: 'signal',
      density: 'comfortable',
      reduceMotion: null,
      clockFormat: '24h',
      dockAutohide: false,
      bootSeen: false,
      setTheme: (theme) => set({ theme }),
      setWallpaper: (wallpaper) => set({ wallpaper }),
      setAccent: (accent) => set({ accent }),
      setDensity: (density) => set({ density }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setClockFormat: (clockFormat) => set({ clockFormat }),
      setDockAutohide: (dockAutohide) => set({ dockAutohide }),
      markBootSeen: () => set({ bootSeen: true }),
    }),
    { name: 'os:settings:v2' },
  ),
);
