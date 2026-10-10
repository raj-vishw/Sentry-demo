import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/layout/PageContainer';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function ServerErrorPage({ onRetry }: { onRetry?: () => void }) {
  useDocumentTitle('Something went wrong');
  return (
    <PageContainer className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="font-mono text-sm uppercase tracking-widest text-[var(--color-error)]">Error 500</p>
      <h1 className="mt-3 font-display text-4xl font-bold text-[var(--color-text-primary)]">
        Something broke on our end
      </h1>
      <p className="mt-3 max-w-sm text-[var(--color-text-secondary)]">
        An unexpected error occurred. Reloading usually fixes it — if it keeps
        happening, let us know what you were doing.
      </p>
      <Button className="mt-8" leftIcon={<RotateCcw className="size-4" />} onClick={onRetry ?? (() => window.location.reload())}>
        Reload
      </Button>
    </PageContainer>
  );
}
