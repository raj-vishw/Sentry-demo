import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function ErrorState({
  title = 'Something went wrong',
  description = 'The request failed. Try again in a moment.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 px-6 py-16 text-center"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-[var(--color-error)]/10">
        <AlertTriangle className="size-5 text-[var(--color-error)]" aria-hidden="true" />
      </div>
      <h3 className="font-display text-base font-semibold text-[var(--color-text-primary)]">{title}</h3>
      <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
