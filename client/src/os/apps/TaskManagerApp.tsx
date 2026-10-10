import { X } from 'lucide-react';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ListChecks } from 'lucide-react';
import { useWindowStore } from '../state/windowStore';
import { getApp } from './registry';
import { cn } from '@/lib/utils';

export function TaskManagerApp() {
  const windows = useWindowStore((s) => s.windows);
  const focusedId = useWindowStore((s) => s.focusedId);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);

  if (windows.length === 0) {
    return (
      <div className="p-6">
        <EmptyState icon={ListChecks} title="No applications running" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-3">
      {windows.map((w) => {
        const app = getApp(w.appId);
        if (!app) return null;
        const Icon = app.icon;
        return (
          <div
            key={w.id}
            className={cn(
              'flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm',
              w.id === focusedId ? 'bg-[var(--color-surface-elevated)]' : 'hover:bg-[var(--color-surface-hover)]',
            )}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-accent)]">
              <Icon className="size-4" />
            </span>
            <button type="button" onClick={() => focusWindow(w.id)} className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[var(--color-text-primary)]">{w.title}</span>
              <span className="block text-xs text-[var(--color-text-muted)]">
                {w.minimized ? 'Minimized' : w.id === focusedId ? 'Active' : 'Running'} · Workspace {w.workspace + 1}
              </span>
            </button>
            <button
              type="button"
              onClick={() => closeWindow(w.id)}
              aria-label={`Close ${w.title}`}
              className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-error)]/15 hover:text-[var(--color-error)]"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
