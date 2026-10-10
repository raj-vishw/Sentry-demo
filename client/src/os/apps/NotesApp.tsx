import { useState } from 'react';
import { NotebookPen, Plus, Trash2 } from 'lucide-react';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { cn } from '@/lib/utils';

interface StandaloneNote {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
}

/**
 * A real, session-persisted notes app — distinct from the per-challenge
 * Notes panel in the Laboratory. Stored under its own localStorage key so
 * the two never collide.
 */
export function NotesApp({ isCompact }: { isCompact: boolean }) {
  const [notes, setNotes] = useLocalStorageState<StandaloneNote[]>('os:notes:v1', []);
  const [activeId, setActiveId] = useState<string | null>(notes[0]?.id ?? null);

  const active = notes.find((n) => n.id === activeId) ?? null;

  function createNote() {
    const note: StandaloneNote = { id: crypto.randomUUID(), title: 'Untitled note', body: '', updatedAt: Date.now() };
    setNotes((prev) => [note, ...prev]);
    setActiveId(note.id);
  }

  function updateActive(patch: Partial<StandaloneNote>) {
    if (!active) return;
    setNotes((prev) =>
      prev.map((n) => (n.id === active.id ? { ...n, ...patch, updatedAt: Date.now() } : n)),
    );
  }

  function deleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeId === id) setActiveId(null);
  }

  return (
    <div className={cn('flex h-full min-h-0', isCompact ? 'flex-col' : 'flex-row')}>
      <div
        className={cn(
          'flex shrink-0 flex-col gap-1 overflow-y-auto border-[var(--color-glass-border)] p-2',
          isCompact ? 'max-h-40 border-b' : 'w-52 border-r',
        )}
      >
        <button
          type="button"
          onClick={createNote}
          className="mb-1 flex items-center gap-2 rounded-[var(--radius-md)] px-2.5 py-2 text-left text-sm text-[var(--color-accent)] hover:bg-[var(--color-surface-hover)]"
        >
          <Plus className="size-4" /> New note
        </button>
        {notes.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setActiveId(n.id)}
            className={cn(
              'group flex items-center justify-between rounded-[var(--radius-md)] px-2.5 py-2 text-left text-sm transition-colors',
              n.id === activeId
                ? 'bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]',
            )}
          >
            <span className="truncate">{n.title || 'Untitled note'}</span>
            <Trash2
              className="size-3.5 shrink-0 opacity-0 transition-opacity hover:text-[var(--color-danger)] group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                deleteNote(n.id);
              }}
            />
          </button>
        ))}
      </div>

      <div className="min-w-0 flex-1 p-4">
        {!active ? (
          <EmptyState icon={NotebookPen} title="No note selected" description="Create a note to start writing." />
        ) : (
          <div className="flex h-full flex-col gap-3">
            <input
              value={active.title}
              onChange={(e) => updateActive({ title: e.target.value })}
              placeholder="Note title"
              className="w-full bg-transparent font-display text-lg font-semibold text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
            />
            <textarea
              value={active.body}
              onChange={(e) => updateActive({ body: e.target.value })}
              placeholder="Write your investigation notes..."
              className="min-h-0 flex-1 resize-none bg-transparent text-sm leading-relaxed text-[var(--color-text-secondary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
            />
            <p className="font-mono text-[10px] text-[var(--color-text-muted)]">Saved locally in this browser.</p>
          </div>
        )}
      </div>
    </div>
  );
}
