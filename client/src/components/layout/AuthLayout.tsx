import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Logo } from '@/components/navigation/Logo';

export function AuthLayout({
  title,
  subtitle,
  eyebrow = 'Sentry OS · Access',
  children,
  aside,
}: {
  title: string;
  subtitle: string;
  eyebrow?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="theme-public relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-bg)] px-4 py-12">
      <div className="bg-grid-fine pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex w-full max-w-md flex-col items-center gap-6"
      >
        <Logo className="scale-110" />
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[var(--color-text-muted)]">
          {eyebrow}
        </p>

        <div className="glass-panel-strong w-full rounded-[var(--radius-xl)] p-8 sm:p-10">
          <h1 className="text-center font-display text-2xl font-semibold text-[var(--color-text-primary)]">
            {title}
          </h1>
          <p className="mt-2 text-center text-sm text-[var(--color-text-secondary)]">{subtitle}</p>

          <div className="mt-8">{children}</div>
        </div>

        {aside && <div className="w-full">{aside}</div>}
      </motion.div>
    </div>
  );
}
