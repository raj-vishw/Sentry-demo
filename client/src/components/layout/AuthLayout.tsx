import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { PublicWordmark } from '@/components/navigation/PublicWordmark';
import { PublicThemeToggle } from '@/components/navigation/PublicThemeToggle';
import { usePublicThemeClassName } from '@/stores/publicThemeStore';

export function AuthLayout({
  title,
  subtitle,
  eyebrow = '// sentry · access',
  children,
  aside,
}: {
  title: string;
  subtitle: string;
  eyebrow?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  const themeClassName = usePublicThemeClassName();
  return (
    <div className={`${themeClassName} relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-bg)] px-4 py-12`}>
      <div className="bg-grid-fine pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

      <PublicThemeToggle className="absolute right-5 top-5 z-10" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-[1] flex w-full max-w-md flex-col items-center gap-6"
      >
        <PublicWordmark className="scale-110" />
        <p className="font-mono text-[11px] tracking-widest text-[var(--color-accent)]">{eyebrow}</p>

        <div className="w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-1.5 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-[var(--color-border-strong)]" />
            <span className="size-2.5 rounded-full bg-[var(--color-border-strong)]" />
            <span className="size-2.5 rounded-full bg-[var(--color-border-strong)]" />
          </div>
          <div className="p-8 sm:p-10">
            <h1 className="text-center font-display text-2xl font-bold text-[var(--color-text-primary)]">{title}</h1>
            <p className="mt-2 text-center text-sm text-[var(--color-text-secondary)]">{subtitle}</p>

            <div className="mt-8">{children}</div>
          </div>
        </div>

        {aside && <div className="w-full">{aside}</div>}
      </motion.div>
    </div>
  );
}
