import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Theme for the public marketing/docs/auth shell (`.theme-public` in
 * tokens.css) — deliberately separate from the OS's own dark/light
 * preference (os/state/settingsStore.ts). The public shell has its own
 * fixed "Terminal Noir" identity precisely so it never reflects
 * per-instance admin branding; this just toggles which of its two
 * palettes (dark/light) is active, independent of everything else.
 */
interface PublicThemeState {
  theme: 'dark' | 'light';
  toggle: () => void;
}

export const usePublicThemeStore = create<PublicThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      toggle: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'public-theme:v1' },
  ),
);

export function usePublicThemeClassName(): string {
  const theme = usePublicThemeStore((s) => s.theme);
  return theme === 'light' ? 'theme-public theme-public-light' : 'theme-public';
}
