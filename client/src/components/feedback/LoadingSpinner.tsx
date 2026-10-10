import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LoadingSpinner({
  className,
  label = 'Loading',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-12', className)} role="status">
      <Loader2 className="size-5 animate-spin text-[var(--color-accent)]" aria-hidden="true" />
      <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>
    </div>
  );
}
