import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/layout/PageContainer';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle('Not found');
  return (
    <PageContainer className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="font-mono text-sm uppercase tracking-widest text-[var(--color-accent)]">Error 404</p>
      <h1 className="mt-3 font-display text-4xl font-bold text-[var(--color-text-primary)]">
        Target not found
      </h1>
      <p className="mt-3 max-w-sm text-[var(--color-text-secondary)]">
        The route you requested doesn&apos;t exist on this system.
      </p>
      <Link to="/" className="mt-8">
        <Button leftIcon={<Compass className="size-4" />}>Return to base</Button>
      </Link>
    </PageContainer>
  );
}
