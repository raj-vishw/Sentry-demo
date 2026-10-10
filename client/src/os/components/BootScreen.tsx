import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-6 bg-[var(--color-bg)]"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <button
        type="button"
        onClick={onDone}
        className="absolute right-6 top-6 font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
      >
        Skip
      </button>

      <motion.p
        initial={{ opacity: 0, letterSpacing: '0.1em' }}
        animate={{ opacity: 1, letterSpacing: '0.35em' }}
        transition={{ duration: 0.6 }}
        className="font-display text-2xl font-semibold text-[var(--color-text-primary)]"
      >
        {platformName.toUpperCase()} OS
      </motion.p>

      {bootMessage && (
        <p className="max-w-sm text-balance text-center text-sm text-[var(--color-text-secondary)]">{bootMessage}</p>
      )}

      <div className="h-px w-48 overflow-hidden bg-[var(--color-glass-border)]">
        <motion.div
          className="h-full bg-[var(--color-accent)]"
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        />
      </div>

      <div className="flex h-4 items-center font-mono text-xs text-[var(--color-text-muted)]">
        {STEPS[Math.min(stepIndex, STEPS.length - 1)]}...
      </div>
    </motion.div>
  );
}
