import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WallpaperId = 'observatory' | 'aurora' | 'minimal' | 'matrix' | 'terminal' | 'nebula' | 'void';
export type AccentId = 'signal' | 'discovery' | 'amber';
export type ThemeMode = 'dark' | 'light';

/**
 * Per-user accent preference — applied as an inline style on <html> by
 * OSShell.tsx, which (correctly) wins over the --color-accent default in
 * tokens.css. Keep these in sync with that default by hand: there's no
 * single source of truth between a CSS custom property and a JS value map.
 * "amber" here is a legacy key name repurposed as the cool alternate (the
 * old "Living Cyber OS" cyan) now that "signal" — the default — IS amber.
 */
export const ACCENT_VALUES: Record<AccentId, string> = {
  signal: '#ffb347',
  discovery: '#d946ef',
  amber: '#45d9f5',
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
