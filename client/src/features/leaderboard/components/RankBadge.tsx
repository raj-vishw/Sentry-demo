import { cn } from '@/lib/utils';

const podiumColors: Record<number, string> = {
  1: 'text-[var(--color-warning)] border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10',
  2: 'text-[var(--color-text-primary)] border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)]',
  3: 'text-[var(--color-accent)] border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10',
};

export function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border font-mono text-sm font-semibold',
        podiumColors[rank] ??
          'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]',
      )}
    >
      {String(rank).padStart(2, '0')}
    </span>
  );
}
