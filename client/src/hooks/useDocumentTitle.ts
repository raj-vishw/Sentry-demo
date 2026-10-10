import { useEffect } from 'react';
import { usePlatformConfigStore } from '@/stores/platformConfigStore';

/** Sets `document.title` for the life of the calling page, restoring the
 * previous title on unmount — no new dependency (see useFocusTrap for the
 * same hand-roll-over-dependency convention). The suffix follows the
 * admin-configurable platform name (Control Center → Settings) rather
 * than a hardcoded "Sentry", falling back to that default before the
 * platform config has loaded. */
export function useDocumentTitle(title: string) {
  const platformName = usePlatformConfigStore((s) => s.config?.platformName) ?? 'Sentry';
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} — ${platformName}`;
    return () => {
      document.title = previous;
    };
  }, [title, platformName]);
}
