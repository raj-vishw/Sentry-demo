import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)]',
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function ChallengeCardSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-1 py-3 last:border-0">
      <Skeleton className="size-1.5 shrink-0 rounded-none" />
      <Skeleton className="h-3 w-12 shrink-0" />
      <Skeleton className="h-3 flex-1" />
      <Skeleton className="h-3 w-12 shrink-0" />
    </div>
  );
}
