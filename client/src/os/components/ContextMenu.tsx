import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ContextMenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

export function ContextMenu({ state, onClose }: { state: ContextMenuState | null; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state) return;
    function onDocPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('pointerdown', onDocPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onDocPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [state, onClose]);

  if (!state) return null;

  const clampedX = Math.min(state.x, window.innerWidth - 220);
  const clampedY = Math.min(state.y, window.innerHeight - state.items.length * 36 - 16);

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={ref}
        role="menu"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.12 }}
        className="glass-panel-strong fixed z-[700] min-w-[200px] overflow-hidden rounded-[var(--radius-md)] p-1.5"
        style={{ left: clampedX, top: clampedY }}
      >
        {state.items.map((item, i) => (
          <button
            key={i}
            role="menuitem"
            type="button"
            disabled={item.disabled}
            onClick={() => {
              item.onSelect();
              onClose();
            }}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-sm transition-colors disabled:opacity-40',
              item.danger
                ? 'text-[var(--color-error)] hover:bg-[var(--color-error)]/10'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]',
            )}
          >
            {item.icon && <item.icon className="size-4 shrink-0" />}
            {item.label}
          </button>
        ))}
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
