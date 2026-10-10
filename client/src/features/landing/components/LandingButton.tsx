import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The landing page's own button style — deliberately NOT the shared
 * `Button` component, which is wired to the admin-configurable
 * `--color-accent` theme variable. This page's visual system (flat,
 * emerald, no glow) is hardcoded on purpose: it's marketing copy for the
 * self-hosted template, shown before an admin has necessarily configured
 * anything, and shouldn't shift with per-instance branding.
 */
export function LandingButton({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  className,
  children,
  ...props
}: {
  variant?: 'primary' | 'outline';
  size?: 'md' | 'lg';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  children: ReactNode;
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium transition-colors',
        size === 'lg' ? 'h-12 px-7 text-base' : 'h-11 px-5 text-sm',
        variant === 'primary'
          ? 'bg-emerald-500 text-black hover:bg-emerald-400'
          : 'border border-white/15 text-white hover:border-emerald-500/50 hover:text-emerald-400',
        className,
      )}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </span>
  );
}
