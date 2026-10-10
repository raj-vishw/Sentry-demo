import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function PageContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        '@container mx-auto w-full max-w-7xl px-4 py-[var(--space-page-y)] sm:px-6 lg:px-8',
        className,
      )}
      {...props}
    />
  );
}
