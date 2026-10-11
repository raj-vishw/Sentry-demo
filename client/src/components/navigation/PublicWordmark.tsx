import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * The public shell's own wordmark — deliberately not the shared `Logo`
 * (node-graph icon), which carries the OS's "Living Cyber OS" identity.
 * The public shell is a distinct "Terminal Noir" identity (see
 * tokens.css's `.theme-public`), so it gets its own mark: a prompt
 * caret + a blinking block cursor, reusing `--color-accent`, so it still
 * re-themes for free between the dark and light public palettes.
 */
export function PublicWordmark({ className, to = '/' }: { className?: string; to?: string }) {
  return (
    <Link
      to={to}
      className={cn('inline-flex items-center gap-2 font-mono text-lg font-bold tracking-tight', className)}
    >
      <span className="text-[var(--color-accent)]">&gt;</span>
      <span className="text-[var(--color-text-primary)]">
        SENTRY_
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-[1em] w-[0.5em] translate-y-[0.1em] animate-pulse-slow bg-[var(--color-accent)] align-middle"
        />
      </span>
    </Link>
  );
}
