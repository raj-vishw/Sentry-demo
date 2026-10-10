import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAppBasePath } from '@/lib/appPath';
import { cn } from '@/lib/utils';

/**
 * Deliberately not built on the viewport-height `PageContainer` pattern
 * `NotFoundPage`/`ServerErrorPage` use — this one is also embedded inside a
 * fixed-height OS window panel (AdminConsoleApp), so its height follows
 * whatever the caller's container gives it instead of forcing `min-h-[70vh]`.
 */
export function ForbiddenPage({ message, className }: { message?: string; className?: string }) {
  const appBasePath = useAppBasePath();
  return (
    <div className={cn('flex h-full flex-col items-center justify-center gap-1 p-8 text-center', className)}>
      <p className="font-mono text-sm uppercase tracking-widest text-[var(--color-error)]">Error 403</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-[var(--color-text-primary)]">Access denied</h1>
      <p className="mt-2 max-w-sm text-sm text-[var(--color-text-secondary)]">
        {message ?? 'You do not have permission to view this.'}
      </p>
      <Link to={`${appBasePath}/dashboard`} className="mt-6">
        <Button leftIcon={<ShieldAlert className="size-4" />}>Return to dashboard</Button>
      </Link>
    </div>
  );
}
