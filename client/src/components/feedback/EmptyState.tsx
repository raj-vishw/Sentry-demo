import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-glass-border)] px-6 py-16 text-center">
      <div className="relative flex size-14 items-center justify-center rounded-full bg-[var(--color-surface-elevated)]">
        <div className="absolute inset-0 rounded-full border border-dashed border-[var(--color-glass-border-strong)]" />
        <Icon className="size-5 text-[var(--color-text-muted)]" aria-hidden="true" />
      </div>
      <h3 className="font-display text-base font-semibold text-[var(--color-text-primary)]">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">{description}</p>
      )}
      {action}
    </div>
  );
}
