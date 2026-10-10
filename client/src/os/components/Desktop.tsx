import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderPlus, LayoutGrid, RefreshCw, Settings as SettingsIcon } from 'lucide-react';
import { AnimatedBackground } from '@/components/animation/AnimatedBackground';
import { OrbitalRings } from '@/components/animation/OrbitalRings';
import { DigitalRain } from '@/components/animation/DigitalRain';
import { useAuthStore } from '@/stores/authStore';
import { useWindowStore } from '../state/windowStore';
import { useSettingsStore } from '../state/settingsStore';
import { listApps } from '../apps/registry';
import { ContextMenu, type ContextMenuState } from './ContextMenu';
import type { AppDefinition } from '../types';
import { cn } from '@/lib/utils';

const DESKTOP_ICON_IDS = [
  'explore',
  'leaderboard',
  'teams',
  'files',
  'notes',
  'taskmanager',
  'settings',
  'admin',
];

const ICON_W = 88;
const ICON_H = 92;
const GRID_LEFT = 16;
// Stay clear of the fixed top bar (48px + margin) PLUS the permanent
// DemoBanner's 32px (--demo-banner-height in globals.css) — this is
// computed against window.innerHeight directly (see the resize handler
// below), so the banner's height must be folded in here too.
const TOP_CLEARANCE = 64 + 32;
const BOTTOM_CLEARANCE = 96; // stay clear of the floating dock

type Positions = Record<string, { x: number; y: number }>;

function defaultPosition(index: number): { x: number; y: number } {
  const perColumn = Math.max(1, Math.floor((window.innerHeight - TOP_CLEARANCE - BOTTOM_CLEARANCE) / ICON_H));
  const col = Math.floor(index / perColumn);
  const row = index % perColumn;
  // Row 0 must start at TOP_CLEARANCE, not the smaller GRID_TOP — otherwise
  // a freshly reset layout places icons closer to the top bar than a
  // manually dragged icon is ever allowed to be (drag/resize clamping both
  // use TOP_CLEARANCE as the real minimum y).
  return { x: GRID_LEFT + col * ICON_W, y: TOP_CLEARANCE + row * ICON_H };
}

function loadPositions(): Positions {
  try {
    const raw = localStorage.getItem('os:icon-positions:v1');
    return raw ? (JSON.parse(raw) as Positions) : {};
  } catch {
    return {};
  }
}

function savePositions(positions: Positions) {
  try {
    localStorage.setItem('os:icon-positions:v1', JSON.stringify(positions));
  } catch {
    // Storage unavailable — icons just fall back to grid order next load.
  }
}

export function Desktop() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const wallpaper = useSettingsStore((s) => s.wallpaper);
  const openApp = useWindowStore((s) => s.openApp);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [positions, setPositions] = useState<Positions>(() => loadPositions());
  const dragRef = useRef<{ id: string; startX: number; startY: number; origin: { x: number; y: number } } | null>(
    null,
  );

  const apps = listApps({ isAdmin: role === 'admin' }).filter((a) => DESKTOP_ICON_IDS.includes(a.id));
  const orderedApps: AppDefinition[] = DESKTOP_ICON_IDS.map((id) => apps.find((a) => a.id === id)).filter(
    (a): a is AppDefinition => a !== undefined,
  );

  function launch(appId: string) {
    const app = orderedApps.find((a) => a.id === appId);
    if (!app) return;
    if (app.routePattern && app.buildPath) {
      navigate(app.buildPath({}));
    } else {
      openApp(appId);
    }
  }

  function positionFor(appId: string, index: number) {
    return positions[appId] ?? defaultPosition(index);
  }

  function onIconPointerDown(appId: string, index: number) {
    return (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      setSelected(appId);
      dragRef.current = { id: appId, startX: e.clientX, startY: e.clientY, origin: positionFor(appId, index) };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };
  }

  function onIconPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const next = {
      x: Math.max(4, Math.min(window.innerWidth - ICON_W, drag.origin.x + dx)),
      y: Math.max(TOP_CLEARANCE, Math.min(window.innerHeight - BOTTOM_CLEARANCE, drag.origin.y + dy)),
    };
    setPositions((prev) => ({ ...prev, [drag.id]: next }));
  }

  function onIconPointerUp() {
    if (!dragRef.current) return;
    dragRef.current = null;
    setPositions((prev) => {
      savePositions(prev);
      return prev;
    });
  }

  function resetLayout() {
    setPositions({});
    savePositions({});
  }

  function onDesktopContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: 'Open Explore', icon: LayoutGrid, onSelect: () => launch('explore') },
        { label: 'New Note', icon: FolderPlus, onSelect: () => openApp('notes') },
        { label: 'Reset icon layout', icon: RefreshCw, onSelect: resetLayout },
        { label: 'Display Settings', icon: SettingsIcon, onSelect: () => openApp('settings') },
      ],
    });
  }

  // Re-clamp persisted positions if the viewport shrank since they were saved.
  useEffect(() => {
    function onResize() {
      setPositions((prev) => {
        const clamped: Positions = {};
        for (const [id, pos] of Object.entries(prev)) {
          clamped[id] = {
            x: Math.max(4, Math.min(window.innerWidth - ICON_W, pos.x)),
            y: Math.max(TOP_CLEARANCE, Math.min(window.innerHeight - BOTTOM_CLEARANCE, pos.y)),
          };
        }
        return clamped;
      });
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      onContextMenu={onDesktopContextMenu}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) setSelected(null);
      }}
    >
      {wallpaper === 'observatory' && (
        <>
          <AnimatedBackground className="pointer-events-none absolute inset-0 h-full w-full opacity-60" />
          <OrbitalRings className="pointer-events-none opacity-40" />
        </>
      )}

      {wallpaper === 'aurora' && (
        <>
          <AnimatedBackground className="pointer-events-none absolute inset-0 h-full w-full opacity-40" />
          <div
            className="animate-drift pointer-events-none absolute inset-0 opacity-80"
            style={{
              background:
                'radial-gradient(55% 45% at 18% 12%, color-mix(in srgb, var(--color-secondary) 26%, transparent), transparent), ' +
                'radial-gradient(50% 40% at 88% 78%, color-mix(in srgb, var(--color-accent) 24%, transparent), transparent), ' +
                'radial-gradient(40% 35% at 60% 95%, color-mix(in srgb, var(--color-tertiary) 14%, transparent), transparent)',
            }}
          />
        </>
      )}

      {/* Soft multi-hue accent wash — distinct from "void" below by actually
          carrying color (accent + secondary + tertiary) rather than a
          single monochrome point of light. */}
      {wallpaper === 'minimal' && (
        <div
          className="animate-drift pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(70% 50% at 15% -10%, color-mix(in srgb, var(--color-accent) 16%, transparent), transparent), ' +
              'radial-gradient(60% 45% at 90% 15%, color-mix(in srgb, var(--color-secondary) 12%, transparent), transparent), ' +
              'radial-gradient(55% 40% at 50% 105%, color-mix(in srgb, var(--color-tertiary) 9%, transparent), transparent)',
          }}
        />
      )}

      {wallpaper === 'matrix' && (
        <DigitalRain className="pointer-events-none absolute inset-0 h-full w-full opacity-70" />
      )}

      {/* Fixed green rather than the theme accent — "terminal" is a
          specific, recognizable aesthetic (green-on-black CLI), not a
          tinted variant of whatever accent color is selected. */}
      {wallpaper === 'terminal' && (
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              'repeating-linear-gradient(0deg, rgba(60,255,120,0.05) 0px, rgba(60,255,120,0.05) 1px, transparent 1px, transparent 3px), ' +
              'radial-gradient(120% 80% at 50% 0%, rgba(60,255,120,0.12), transparent 70%)',
          }}
        />
      )}

      {wallpaper === 'nebula' && (
        <div
          className="animate-drift pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              'radial-gradient(60% 50% at 10% 20%, color-mix(in srgb, #ff2bd6 35%, transparent), transparent), ' +
              'radial-gradient(55% 45% at 90% 15%, color-mix(in srgb, #00e5ff 32%, transparent), transparent), ' +
              'radial-gradient(70% 60% at 50% 100%, color-mix(in srgb, #7c3aed 28%, transparent), transparent)',
          }}
        />
      )}

      {/* Genuinely colorless — unlike "minimal" above, no accent mix at
          all. This is the "almost nothing" option: a bare, barely-visible
          vignette in pure white/black, not a faint tint of the theme. */}
      {wallpaper === 'void' && (
        <div
          className="pointer-events-none absolute inset-0 opacity-100"
          style={{
            background: 'radial-gradient(45% 30% at 50% 0%, rgb(255 255 255 / 0.04), transparent)',
          }}
        />
      )}

      <div className="bg-grid-fine pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />

      {orderedApps.map((app, index) => {
        const Icon = app.icon;
        const pos = positionFor(app.id, index);
        return (
          <button
            key={app.id}
            type="button"
            onClick={() => setSelected(app.id)}
            onDoubleClick={() => launch(app.id)}
            onPointerDown={onIconPointerDown(app.id, index)}
            onPointerMove={onIconPointerMove}
            onPointerUp={onIconPointerUp}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                launch(app.id);
              }
            }}
            className={cn(
              'absolute flex w-20 flex-col items-center gap-1.5 rounded-[var(--radius-md)] p-2 text-center outline-none',
              'focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
              selected === app.id ? 'bg-[var(--color-accent)]/15' : 'hover:bg-white/5',
            )}
            style={{ left: pos.x, top: pos.y, touchAction: 'none' }}
          >
            <span className="flex size-11 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-glass-border)] bg-[var(--color-surface)]/70 text-[var(--color-accent)] shadow-sm">
              <Icon className="size-5" />
            </span>
            <span className="line-clamp-2 text-[11px] leading-tight text-[var(--color-text-secondary)] [text-shadow:0_1px_3px_rgb(0_0_0_/_0.6)]">
              {app.title}
            </span>
          </button>
        );
      })}

      <ContextMenu state={menu} onClose={() => setMenu(null)} />
    </div>
  );
}
