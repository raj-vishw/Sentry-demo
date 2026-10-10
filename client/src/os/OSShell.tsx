import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { TopBar } from './components/TopBar';
import { BottomDock } from './components/BottomDock';
import { Desktop } from './components/Desktop';
import { WindowManager } from './components/WindowManager';
import { BootScreen } from './components/BootScreen';
import { useWindowStore } from './state/windowStore';
import { useNotificationStore } from './state/notificationStore';
import { useSettingsStore, ACCENT_VALUES } from './state/settingsStore';
import { resolveAppFromPath } from './lib/resolveApp';
import { useAuthStore } from '@/stores/authStore';
import { useAnnouncementPolling } from '@/features/announcements/useAnnouncementPolling';

function useRouteWindowSync() {
  const location = useLocation();
  const openApp = useWindowStore((s) => s.openApp);

  useEffect(() => {
    const match = resolveAppFromPath(location.pathname);
    if (match) openApp(match.appId, match.params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
}

export function OSShell() {
  useRouteWindowSync();
  useAnnouncementPolling();
  const [booting, setBooting] = useState(() => !useSettingsStore.getState().bootSeen);
  const accent = useSettingsStore((s) => s.accent);
  const markBootSeen = useSettingsStore((s) => s.markBootSeen);
  const username = useAuthStore((s) => s.user?.username);
  const pushNotification = useNotificationStore((s) => s.push);

  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', ACCENT_VALUES[accent]);
    return () => {
      document.documentElement.style.removeProperty('--color-accent');
    };
  }, [accent]);

  useEffect(() => {
    if (!username) return;
    pushNotification({ category: 'system', title: 'Environment ready', message: `Welcome back, ${username}.` });
    // Runs once per shell mount (session), not on every username reference change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finishBoot() {
    markBootSeen();
    setBooting(false);
  }

  return (
    // top-8 (not inset-0): reserves the permanent DemoBanner's height at
    // the true viewport top — see globals.css's --demo-banner-height
    // comment for the full list of places this offset is kept in sync.
    <div className="fixed inset-x-0 bottom-0 top-8 overflow-hidden bg-[var(--color-bg)]">
      <TopBar />
      <Desktop />
      <WindowManager />
      <BottomDock />
      <AnimatePresence>{booting && <BootScreen onDone={finishBoot} />}</AnimatePresence>
    </div>
  );
}
