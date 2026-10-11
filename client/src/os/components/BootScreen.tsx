import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { usePlatformConfigStore } from '@/stores/platformConfigStore';

const STEPS = ['Initializing environment', 'Loading user profile', 'Mounting laboratory', 'Preparing workspace'];
const STEP_INTERVAL = 260;

export function BootScreen({ onDone }: { onDone: () => void }) {
  const reduceMotion = usePrefersReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);
  const bootMessage = usePlatformConfigStore((s) => s.config?.bootMessage);
  const platformName = usePlatformConfigStore((s) => s.config?.platformName) ?? 'Sentry';

  useEffect(() => {
    if (reduceMotion) {
      onDone();
      return;
    }
    if (stepIndex >= STEPS.length) {
      const t = setTimeout(onDone, 220);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStepIndex((i) => i + 1), STEP_INTERVAL);
    return () => clearTimeout(t);
  }, [stepIndex, reduceMotion, onDone]);

  if (reduceMotion) return null;

  const progress = Math.min(1, stepIndex / STEPS.length);

  return (
    <motion.div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-7 overflow-hidden bg-[var(--color-bg)]"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-grid-fine pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

      <button
        type="button"
        onClick={onDone}
        className="absolute right-6 top-6 font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
      >
        Skip
      </button>

      <motion.svg
        viewBox="0 0 32 32"
        className="relative size-12"
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <rect width="32" height="32" rx="9" fill="var(--color-bg-raised)" />
        <motion.circle
          cx="16"
          cy="16"
          r="9"
          stroke="var(--color-glass-border-strong)"
          strokeWidth="1"
          fill="none"
        />
        <motion.circle
          cx="16"
          cy="16"
          r="9"
          stroke="var(--color-accent)"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          initial={{ strokeDashoffset: 1 }}
          animate={{ strokeDashoffset: 1 - progress }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        />
        <line x1="16" y1="16" x2="16" y2="7.5" stroke="var(--color-accent)" strokeWidth="1.2" opacity="0.6" />
        <line x1="16" y1="16" x2="23" y2="20" stroke="var(--color-accent)" strokeWidth="1.2" opacity="0.6" />
        <line x1="16" y1="16" x2="9.5" y2="20.5" stroke="var(--color-accent)" strokeWidth="1.2" opacity="0.6" />
        <circle cx="16" cy="7.5" r="1.6" fill="var(--color-secondary)" />
        <circle cx="23" cy="20" r="1.6" fill="var(--color-accent)" />
        <circle cx="9.5" cy="20.5" r="1.6" fill="var(--color-accent)" />
        <circle cx="16" cy="16" r="3.2" fill="var(--color-surface)" stroke="var(--color-accent)" strokeWidth="1.4" />
      </motion.svg>

      <motion.p
        initial={{ opacity: 0, letterSpacing: '0.1em' }}
        animate={{ opacity: 1, letterSpacing: '0.35em' }}
        transition={{ duration: 0.6 }}
        className="relative font-display text-2xl font-semibold text-[var(--color-text-primary)]"
      >
        {platformName.toUpperCase()} OS
      </motion.p>

      {bootMessage && (
        <p className="relative max-w-sm text-balance text-center text-sm text-[var(--color-text-secondary)]">
          {bootMessage}
        </p>
      )}

      <div className="relative flex w-56 flex-col gap-1.5">
        {STEPS.map((step, i) => {
          const done = i < stepIndex;
          const active = i === stepIndex;
          return (
            <div key={step} className="flex items-center gap-2 font-mono text-xs">
              <span
                className={
                  done
                    ? 'flex size-3.5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-text-inverse)]'
                    : 'flex size-3.5 items-center justify-center rounded-full border border-[var(--color-border-strong)]'
                }
              >
                {done && <Check className="size-2.5" strokeWidth={3} />}
                {active && !done && (
                  <motion.span
                    className="size-1.5 rounded-full bg-[var(--color-accent)]"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
              </span>
              <span className={done || active ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-muted)]'}>
                {step}
              </span>
            </div>
          );
        })}
      </div>

      <div className="relative h-px w-56 overflow-hidden bg-[var(--color-glass-border)]">
        <motion.div
          className="h-full bg-[var(--color-accent)]"
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}
