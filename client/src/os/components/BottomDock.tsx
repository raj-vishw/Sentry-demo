import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Grip, Minus, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useWindowStore } from '../state/windowStore';
import { useSettingsStore } from '../state/settingsStore';
import { listApps, getApp } from '../apps/registry';
import { useCommandPalette } from '@/features/search/CommandPaletteProvider';
import { ContextMenu, type ContextMenuState } from './ContextMenu';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

export function BottomDock() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const windows = useWindowStore((s) => s.windows);
  const activeWorkspace = useWindowStore((s) => s.activeWorkspace);
  const focusedId = useWindowStore((s) => s.focusedId);
  const openApp = useWindowStore((s) => s.openApp);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const { open: openPalette } = useCommandPalette();
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const dockAutohide = useSettingsStore((s) => s.dockAutohide);
  const reduceMotion = usePrefersReducedMotion();
  const [revealed, setRevealed] = useState(true);
  const hidden = dockAutohide && !revealed;

  const pinned = listApps({ isAdmin: role === 'admin' }).filter((a) => a.pinned);
  const runningWindows = windows.filter((w) => w.workspace === activeWorkspace);
  const runningAppIds = new Set(runningWindows.map((w) => w.appId));
  const dockApps = [...pinned, ...listApps({ isAdmin: role === 'admin' }).filter((a) => !a.pinned && runningAppIds.has(a.id))];
  const uniqueDockApps = Array.from(new Map(dockApps.map((a) => [a.id, a])).values());

  function launchApp(appId: string) {
    const app = getApp(appId);
    if (!app) return;
    const win = runningWindows.find((w) => w.appId === appId);
    if (win) {
      if (win.id === focusedId && !win.minimized) minimizeWindow(win.id);
      else focusWindow(win.id);
      return;
    }
    if (app.routePattern && app.buildPath) navigate(app.buildPath({}));
    else openApp(appId);
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[500] flex h-20 items-end justify-center pb-3"
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => dockAutohide && setRevealed(false)}
    >
      <motion.div
        className="glass-panel-strong flex max-w-[94vw] items-center gap-1 overflow-x-auto rounded-[var(--radius-2xl)] px-2 py-2"
        animate={reduceMotion ? { opacity: hidden ? 0 : 1 } : { y: hidden ? 56 : 0, opacity: hidden ? 0 : 1 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ pointerEvents: hidden ? 'none' : 'auto' }}
      >
        <button
          type="button"
          onClick={openPalette}
          aria-label="Application launcher"
          className="flex size-11 items-center justify-center rounded-[var(--radius-lg)] text-[var(--color-accent)] hover:bg-[var(--color-surface-hover)]"
        >
          <Grip className="size-5" />
        </button>

        <div className="mx-1 h-8 w-px bg-[var(--color-glass-border)]" />

        {uniqueDockApps.map((app) => {
          const win = runningWindows.find((w) => w.appId === app.id);
          const Icon = app.icon;
          const isActive = win && win.id === focusedId && !win.minimized;
          return (
            <button
              key={app.id}
              type="button"
              onClick={() => launchApp(app.id)}
              onContextMenu={(e) => {
                if (!win) return;
                e.preventDefault();
                setMenu({
                  x: e.clientX,
                  y: e.clientY,
                  items: [
                    { label: 'Focus', icon: Grip, onSelect: () => focusWindow(win.id) },
                    { label: 'Minimize', icon: Minus, onSelect: () => minimizeWindow(win.id) },
                    { label: 'Close', icon: X, danger: true, onSelect: () => closeWindow(win.id) },
                  ],
                });
              }}
              aria-label={app.title}
              className="group relative flex size-11 items-center justify-center rounded-[var(--radius-lg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
            >
              <Icon className={cn('size-5', isActive && 'text-[var(--color-accent)]')} />
              {win && (
                <span
                  className={cn(
                    'absolute -bottom-0.5 size-1 rounded-full transition-all',
                    isActive ? 'w-4 bg-[var(--color-accent)]' : 'w-1 bg-[var(--color-text-muted)]',
                  )}
                />
              )}
            </button>
          );
        })}
      </motion.div>

      <ContextMenu state={menu} onClose={() => setMenu(null)} />
    </nav>
  );
}
