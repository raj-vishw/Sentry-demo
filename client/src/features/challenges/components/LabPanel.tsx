import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { cn } from '@/lib/utils';

/**
 * A collapsible glass surface for the challenge workspace ("Glass
 * Laboratory") — collapse state persists per-panel in localStorage so the
 * layout a player settles into sticks around.
 */
export function LabPanel({
  id,
  title,
  icon: Icon,
  defaultOpen = true,
  action,
  children,
}: {
  id: string;
  title: string;
  icon?: LucideIcon;
  defaultOpen?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useLocalStorageState(`lab-panel:${id}`, defaultOpen);

  return (
    <GlassPanel className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setOpen(!open)}
          className="flex flex-1 items-center gap-2 text-left"
          aria-expanded={open}
        >
          {Icon && <Icon className="size-4 text-[var(--color-accent)]" aria-hidden="true" />}
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">
            {title}
          </span>
          <ChevronDown
            className={cn('size-3.5 text-[var(--color-text-muted)] transition-transform', open && 'rotate-180')}
          />
        </button>
        {action}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--color-glass-border)] px-4 py-[var(--space-panel-y)]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassPanel>
  );
}
