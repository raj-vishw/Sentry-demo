import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/os/state/settingsStore';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', listener);
    setMatches(mql.matches);
    return () => mql.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

export function usePrefersReducedMotion(): boolean {
  const systemPref = useMediaQuery('(prefers-reduced-motion: reduce)');
  const override = useSettingsStore((s) => s.reduceMotion);
  return override ?? systemPref;
}
