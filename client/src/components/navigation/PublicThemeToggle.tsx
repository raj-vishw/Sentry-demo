import { Moon, Sun } from 'lucide-react';
import { usePublicThemeStore } from '@/stores/publicThemeStore';

export function PublicThemeToggle({ className }: { className?: string }) {
  const theme = usePublicThemeStore((s) => s.theme);
  const toggle = usePublicThemeStore((s) => s.toggle);
  const Icon = theme === 'dark' ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={
        'inline-flex items-center gap-2 border border-[var(--color-border-strong)] px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)] ' +
        (className ?? '')
      }
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  );
}
