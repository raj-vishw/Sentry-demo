import { cn } from '@/lib/utils';

/**
 * Faint concentric orbital rings with a couple of drifting waypoints —
 * pure CSS animation (no rAF/JS cost), used sparingly behind hero/graph
 * surfaces to reinforce the "observatory" motif. Respects reduced-motion
 * globally via the app's `@media (prefers-reduced-motion)` rule, which
 * freezes all CSS animation durations to ~0.
 */
export function OrbitalRings({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 flex items-center justify-center', className)} aria-hidden="true">
      <div className="relative size-[140%] max-w-[1100px]">
        <div className="absolute inset-0 animate-orbit-slow rounded-full border border-[var(--color-glass-border)]" />
        <span className="absolute left-1/2 top-0 size-1.5 -translate-x-1/2 rounded-full bg-[var(--color-accent)]/60 shadow-[var(--shadow-glow-accent)]" />
      </div>

      <div className="absolute size-[95%] max-w-[760px]">
        <div className="absolute inset-0 animate-orbit-reverse rounded-full border border-[var(--color-glass-border)]" />
        <span className="absolute left-0 top-1/2 size-1 -translate-y-1/2 rounded-full bg-[var(--color-secondary)]/60 shadow-[var(--shadow-glow-secondary)]" />
      </div>

      <div className="absolute size-[55%] max-w-[440px] rounded-full border border-dashed border-[var(--color-glass-border)]" />
    </div>
  );
}
