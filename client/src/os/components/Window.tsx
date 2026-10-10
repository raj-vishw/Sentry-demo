import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Minus, Square, X, Copy, LayoutGrid } from 'lucide-react';
import { ObservatoryLoader } from '@/components/feedback/ObservatoryLoader';
import { useWindowStore } from '../state/windowStore';
import { getApp } from '../apps/registry';
import { resolveAppFromPath } from '../lib/resolveApp';
import { useAppBasePath } from '@/lib/appPath';
import { ContextMenu, type ContextMenuState } from './ContextMenu';
import type { Point, Size, SnapZone, WindowInstance } from '../types';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion, useMediaQuery } from '@/hooks/useMediaQuery';

// 56px for the fixed top bar's own clearance + 32px for the permanent
// DemoBanner (--demo-banner-height in globals.css) — every computation
// below is against window.innerHeight/innerWidth directly, so the
// banner's height must be folded into this one constant.
const TOP_MARGIN = 56 + 32;
const EDGE_THRESHOLD = 28;
const CORNER_ZONE = 120;

function computeSnapZone(x: number, y: number): SnapZone {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const nearLeft = x < EDGE_THRESHOLD;
  const nearRight = x > w - EDGE_THRESHOLD;
  const nearTop = y < EDGE_THRESHOLD + TOP_MARGIN;

  if (nearTop && !nearLeft && !nearRight) return 'top';
  if (nearLeft && y < CORNER_ZONE) return 'top-left';
  if (nearRight && y < CORNER_ZONE) return 'top-right';
  if (nearLeft && y > h - CORNER_ZONE) return 'bottom-left';
  if (nearRight && y > h - CORNER_ZONE) return 'bottom-right';
  if (nearLeft) return 'left';
  if (nearRight) return 'right';
  return null;
}

export function zoneRect(zone: SnapZone): { position: Point; size: Size } | null {
  const w = window.innerWidth;
  const h = window.innerHeight - TOP_MARGIN;
  const half = { width: Math.round(w / 2), height: h };
  const quarter = { width: Math.round(w / 2), height: Math.round(h / 2) };

  switch (zone) {
    case 'top':
      return { position: { x: 0, y: TOP_MARGIN }, size: { width: w, height: h } };
    case 'left':
      return { position: { x: 0, y: TOP_MARGIN }, size: half };
    case 'right':
      return { position: { x: w - half.width, y: TOP_MARGIN }, size: half };
    case 'top-left':
      return { position: { x: 0, y: TOP_MARGIN }, size: quarter };
    case 'top-right':
      return { position: { x: w - quarter.width, y: TOP_MARGIN }, size: quarter };
    case 'bottom-left':
      return { position: { x: 0, y: TOP_MARGIN + quarter.height }, size: quarter };
    case 'bottom-right':
      return { position: { x: w - quarter.width, y: TOP_MARGIN + quarter.height }, size: quarter };
    default:
      return null;
  }
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export function Window({
  win,
  stackIndex,
  onSnapPreview,
}: {
  win: WindowInstance;
  stackIndex: number;
  onSnapPreview: (z: SnapZone) => void;
}) {
  const app = getApp(win.appId);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize);
  const moveWindow = useWindowStore((s) => s.moveWindow);
  const resizeWindow = useWindowStore((s) => s.resizeWindow);
  const snapWindow = useWindowStore((s) => s.snapWindow);
  const focusedId = useWindowStore((s) => s.focusedId);
  const workspaceCount = useWindowStore((s) => s.workspaceCount);
  const moveWindowToWorkspace = useWindowStore((s) => s.moveWindowToWorkspace);
  const reduceMotion = usePrefersReducedMotion();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const location = useLocation();
  const navigate = useNavigate();
  const appBasePath = useAppBasePath();
  const [menu, setMenu] = useState<ContextMenuState | null>(null);

  const isFocused = focusedId === win.id;

  function onTitleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    focusWindow(win.id);
    setMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: 'Minimize', icon: Minus, onSelect: () => minimizeWindow(win.id) },
        { label: win.maximized ? 'Restore' : 'Maximize', icon: Square, onSelect: () => toggleMaximize(win.id) },
        ...Array.from({ length: workspaceCount }, (_, i) => i)
          .filter((i) => i !== win.workspace)
          .map((i) => ({
            label: `Move to Workspace ${i + 1}`,
            icon: LayoutGrid,
            onSelect: () => moveWindowToWorkspace(win.id, i),
          })),
        { label: 'Close', icon: X, danger: true, onSelect: handleClose },
      ],
    });
  }

  function handleClose() {
    const current = resolveAppFromPath(location.pathname);
    closeWindow(win.id);
    if (current && current.appId === win.appId && JSON.stringify(current.params) === JSON.stringify(win.params)) {
      navigate(`${appBasePath}/dashboard`);
    }
  }
  const contentRef = useRef<HTMLDivElement>(null);
  const [isCompact, setIsCompact] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origin: Point } | null>(null);
  const resizeRef = useRef<{ handle: ResizeHandle; startX: number; startY: number; origin: Point; size: Size } | null>(
    null,
  );

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setIsCompact(width < 640);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function onTitlePointerDown(e: React.PointerEvent) {
    if (e.button !== 0 || win.maximized || isMobile) return;
    focusWindow(win.id);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origin: win.position };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onTitlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const next = {
      x: Math.max(-40, dragRef.current.origin.x + dx),
      y: Math.max(TOP_MARGIN, dragRef.current.origin.y + dy),
    };
    moveWindow(win.id, next);
    onSnapPreview(computeSnapZone(e.clientX, e.clientY));
  }

  function onTitlePointerUp(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const zone = computeSnapZone(e.clientX, e.clientY);
    dragRef.current = null;
    onSnapPreview(null);
    const rect = zoneRect(zone);
    if (rect) snapWindow(win.id, rect.position, rect.size);
  }

  function onResizePointerDown(handle: ResizeHandle) {
    return (e: React.PointerEvent) => {
      e.stopPropagation();
      focusWindow(win.id);
      resizeRef.current = { handle, startX: e.clientX, startY: e.clientY, origin: win.position, size: win.size };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };
  }

  function onResizePointerMove(e: React.PointerEvent) {
    if (!resizeRef.current || !app) return;
    const { handle, startX, startY, origin, size } = resizeRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    let { width, height } = size;
    let { x, y } = origin;

    if (handle.includes('e')) width = size.width + dx;
    if (handle.includes('s')) height = size.height + dy;
    if (handle.includes('w')) {
      width = size.width - dx;
      x = origin.x + dx;
    }
    if (handle.includes('n')) {
      height = size.height - dy;
      y = origin.y + dy;
    }

    width = Math.max(app.minSize.width, width);
    height = Math.max(app.minSize.height, height);
    if (handle.includes('w')) x = origin.x + (size.width - width);
    if (handle.includes('n')) y = origin.y + (size.height - height);

    resizeWindow(win.id, { width, height }, { x, y: Math.max(TOP_MARGIN, y) });
  }

  function onResizePointerUp() {
    resizeRef.current = null;
  }

  const style = useMemo(() => {
    if (win.maximized || isMobile) {
      return { left: 0, top: TOP_MARGIN, right: 0, bottom: 0, zIndex: 100 + stackIndex } as const;
    }
    return {
      left: win.position.x,
      top: win.position.y,
      width: win.size.width,
      height: win.size.height,
      zIndex: 100 + stackIndex,
    } as const;
  }, [win.maximized, isMobile, win.position.x, win.position.y, win.size.width, win.size.height, stackIndex]);

  if (!app) return null;
  const Icon = app.icon;

  return createPortal(
    <>
    <motion.div
      role="dialog"
      aria-label={win.title}
      className={cn(
        'fixed flex flex-col overflow-hidden rounded-[var(--radius-lg)] border',
        'glass-panel-strong shadow-[0_24px_60px_-16px_rgb(0_0_0_/_0.55)]',
        isFocused ? 'border-[var(--color-glass-border-strong)]' : 'border-[var(--color-glass-border)]',
        win.minimized && 'pointer-events-none',
      )}
      style={style}
      initial={reduceMotion ? undefined : { opacity: 0, scale: 0.96, y: 8 }}
      animate={
        reduceMotion
          ? { opacity: win.minimized ? 0 : 1 }
          : {
              opacity: win.minimized ? 0 : 1,
              scale: win.minimized ? 0.9 : 1,
              y: win.minimized ? 24 : 0,
            }
      }
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      onPointerDownCapture={() => !isFocused && focusWindow(win.id)}
    >
      <div
        className={cn(
          'flex h-[var(--titlebar-h)] shrink-0 items-center gap-2 border-b px-3',
          isFocused ? 'border-[var(--color-glass-border-strong)]' : 'border-[var(--color-glass-border)]',
        )}
        style={{ cursor: win.maximized || isMobile ? 'default' : 'grab', touchAction: 'none' }}
        onPointerDown={onTitlePointerDown}
        onPointerMove={onTitlePointerMove}
        onPointerUp={onTitlePointerUp}
        onDoubleClick={() => toggleMaximize(win.id)}
        onContextMenu={onTitleContextMenu}
      >
        <Icon className={cn('size-4 shrink-0', isFocused ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]')} />
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-sm font-medium',
            isFocused ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]',
          )}
        >
          {win.title}
        </span>

        <div
          className="flex shrink-0 items-center gap-1"
          // The titlebar's own onPointerDown (above) calls setPointerCapture
          // to drive window dragging. Left uncontained, a pointerdown here
          // bubbles up into that handler, which captures the pointer on the
          // titlebar div — retargeting the paired mouseup away from
          // whichever button was pressed, so the browser resolves the
          // resulting `click` to the titlebar (their common ancestor)
          // instead of the button, and the button's onClick never fires.
          // Stopping propagation here keeps drag-initiation from ever
          // seeing clicks on these controls.
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Minimize"
            onClick={() => minimizeWindow(win.id)}
            className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
          >
            <Minus className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={win.maximized ? 'Restore' : 'Maximize'}
            onClick={() => toggleMaximize(win.id)}
            className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
          >
            {win.maximized ? <Copy className="size-3" /> : <Square className="size-3" />}
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={handleClose}
            className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-error)]/20 hover:text-[var(--color-error)]"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Opaque, not glass — content here (Cards etc.) carries its own glass
          treatment, and stacking a second backdrop-filter on top of the
          window's would blur an already-blurred layer into visual mud. */}
      <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-bg-raised)]">
        <Suspense fallback={<ObservatoryLoader label="Loading" className="p-10" />}>
          <app.component windowId={win.id} params={win.params} isCompact={isCompact} />
        </Suspense>
      </div>

      {!win.maximized && !isMobile && (
        <>
          {(['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as ResizeHandle[]).map((handle) => (
            <div
              key={handle}
              onPointerDown={onResizePointerDown(handle)}
              onPointerMove={onResizePointerMove}
              onPointerUp={onResizePointerUp}
              className={cn('absolute', RESIZE_HANDLE_CLASS[handle])}
              style={{ touchAction: 'none' }}
            />
          ))}
        </>
      )}
    </motion.div>
    <ContextMenu state={menu} onClose={() => setMenu(null)} />
    </>,
    document.body,
  );
}

const RESIZE_HANDLE_CLASS: Record<ResizeHandle, string> = {
  n: 'inset-x-2 top-0 h-1.5 cursor-ns-resize',
  s: 'inset-x-2 bottom-0 h-1.5 cursor-ns-resize',
  e: 'inset-y-2 right-0 w-1.5 cursor-ew-resize',
  w: 'inset-y-2 left-0 w-1.5 cursor-ew-resize',
  ne: 'right-0 top-0 size-3 cursor-nesw-resize',
  nw: 'left-0 top-0 size-3 cursor-nwse-resize',
  se: 'right-0 bottom-0 size-3 cursor-nwse-resize',
  sw: 'left-0 bottom-0 size-3 cursor-nesw-resize',
};
