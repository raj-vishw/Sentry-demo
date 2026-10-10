import type { InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SearchInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-muted)]"
        aria-hidden="true"
      />
      <input
        type="search"
        className={cn(
          'h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border-strong)]',
          'bg-[var(--color-surface)] pl-10 pr-3.5 text-sm text-[var(--color-text-primary)]',
          'placeholder:text-[var(--color-text-muted)]',
          'focus:border-[var(--color-accent)] focus-visible:outline-none',
          'transition-colors duration-[var(--duration-fast)]',
          className,
        )}
        {...props}
      />
    </div>
  );
}
