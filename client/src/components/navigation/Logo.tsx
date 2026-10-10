import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function Logo({ className, to = '/' }: { className?: string; to?: string }) {
  return (
    <Link
      to={to}
      className={cn('group inline-flex items-center gap-2 font-display font-semibold', className)}
    >
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="var(--color-bg-raised)" />
        <circle
          cx="16"
          cy="16"
          r="9"
          stroke="var(--color-glass-border-strong)"
          strokeWidth="1"
          fill="none"
        />
        <line x1="16" y1="16" x2="16" y2="7.5" stroke="var(--color-accent)" strokeWidth="1.2" opacity="0.6" />
        <line x1="16" y1="16" x2="23" y2="20" stroke="var(--color-accent)" strokeWidth="1.2" opacity="0.6" />
        <line x1="16" y1="16" x2="9.5" y2="20.5" stroke="var(--color-accent)" strokeWidth="1.2" opacity="0.6" />
        <circle cx="16" cy="7.5" r="1.6" fill="var(--color-secondary)" />
        <circle cx="23" cy="20" r="1.6" fill="var(--color-accent)" />
        <circle cx="9.5" cy="20.5" r="1.6" fill="var(--color-accent)" />
        <circle
          cx="16"
          cy="16"
          r="3.2"
          fill="var(--color-surface)"
          stroke="var(--color-accent)"
          strokeWidth="1.4"
          className="transition-all duration-300 group-hover:stroke-[var(--color-accent-hover)]"
        />
      </svg>
      <span className="text-lg tracking-tight text-[var(--color-text-primary)]">Sentry</span>
    </Link>
  );
}
