import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

/**
 * Replaces the generic spinner for prominent, full-section loading states —
 * reads as "initializing an environment" rather than a bare throbber, per
 * the observatory motif. Falls back to a static glyph under
 * prefers-reduced-motion.
 */
export function ObservatoryLoader({ label = 'Initializing', className }: { label?: string; className?: string }) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-16', className)} role="status">
      <div className="relative size-14">
        <div className="absolute inset-0 rounded-full border border-[var(--color-glass-border)]" />
        <motion.div
          className="absolute inset-0 rounded-full border-t border-[var(--color-accent)]"
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
        />
        <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-accent)] shadow-[var(--shadow-glow-accent)]" />
      </div>
      <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)]">{label}...</p>
    </div>
  );
}
