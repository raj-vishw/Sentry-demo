import { useEffect, useState } from 'react';

/**
 * Per-viewer convenience state (panel collapse, scratch notes) — never
 * used for anything that must sync across devices or be read by the
 * server. Reads/writes are wrapped since storage can throw or be
 * unavailable (private browsing, blocked site data).
 */
export function useLocalStorageState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable — the value still works for this render.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
