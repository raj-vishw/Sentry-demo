import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function ProgressBar({
  value,
  max = 100,
  className,
  barClassName,
  color = 'var(--color-accent)',
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  color?: string;
}) {
  const reduceMotion = useReducedMotion();
  const pct = Math.min(100, Math.round((value / max) * 100));

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-elevated)]', className)}
    >
      <motion.div
        className={cn('h-full rounded-full', barClassName)}
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}
