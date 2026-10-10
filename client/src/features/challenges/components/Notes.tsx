import { useLocalStorageState } from '@/hooks/useLocalStorageState';

/**
 * Real, persisted scratchpad — not a placeholder. Saved per-challenge in
 * this browser's localStorage; there is no backend endpoint for notes yet,
 * so this deliberately doesn't claim to sync across devices.
 */
export function Notes({ challengeId }: { challengeId: string }) {
  const [notes, setNotes] = useLocalStorageState(`notes:${challengeId}`, '');

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={6}
        placeholder="Record your observations, leads, and dead ends..."
        className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-glass-border)] bg-[var(--color-surface)]/60 px-3 py-2.5 font-mono text-xs leading-relaxed text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]/40 focus-visible:outline-none"
      />
      <p className="text-[10px] text-[var(--color-text-muted)]">Saved locally in this browser.</p>
    </div>
  );
}
