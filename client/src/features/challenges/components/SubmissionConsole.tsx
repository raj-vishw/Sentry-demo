import { Terminal } from 'lucide-react';

export interface ConsoleEntry {
  id: string;
  time: string;
  message: string;
  tone: 'success' | 'error' | 'info';
}

const TONE_COLOR: Record<ConsoleEntry['tone'], string> = {
  success: 'var(--color-success)',
  error: 'var(--color-error)',
  info: 'var(--color-text-muted)',
};

/**
 * A real, session-scoped log of this player's own flag-submission attempts
 * against this challenge — built from actual API responses, not a
 * simulated terminal. Resets on page reload; nothing here is persisted or
 * sent anywhere beyond the submission itself.
 */
export function SubmissionConsole({ entries }: { entries: ConsoleEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Terminal className="size-5 text-[var(--color-text-muted)]" />
        <p className="text-xs text-[var(--color-text-muted)]">
          Submission attempts will appear here as you investigate.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5 font-mono text-xs">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-start gap-2">
          <span className="shrink-0 text-[var(--color-text-muted)]">{entry.time}</span>
          <span style={{ color: TONE_COLOR[entry.tone] }}>{entry.message}</span>
        </li>
      ))}
    </ul>
  );
}
