import { Link } from 'react-router-dom';
import type { LeaderboardEntry } from '@/types';
import { formatNumber, cn } from '@/lib/utils';
import { useAppAwarePath } from '@/lib/appPath';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Trophy } from 'lucide-react';

/**
 * "// LEADERBOARD.SYS" manifest rows — zero-padded rank, username (+ team
 * as a muted inline suffix, not its own column), solved count, XP flush
 * right. The current user's row gets a full border box instead of just a
 * background tint, matching the mockup's "you" row treatment.
 */
export function LeaderboardTable({
  entries,
  highlightUserId,
}: {
  entries: LeaderboardEntry[];
  highlightUserId?: string;
}) {
  const toPath = useAppAwarePath();

  if (entries.length === 0) {
    return <EmptyState icon={Trophy} title="No rankings yet" description="Solve a challenge to appear here." />;
  }

  return (
    <div className="flex flex-col border-t border-[var(--color-border)] font-mono text-sm">
      {entries.map((entry) => {
        const isMe = entry.userId === highlightUserId;
        return (
          <div
            key={entry.userId}
            className={cn(
              'flex items-center gap-4 border-b border-[var(--color-border)] px-3 py-2.5 last:border-b-[var(--color-border)]',
              isMe && 'border border-[var(--color-accent)] bg-[var(--color-accent-soft)]',
            )}
          >
            <span className={cn('w-7 shrink-0 text-xs', isMe ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]')}>
              {String(entry.rank).padStart(2, '0')}
            </span>
            <Link
              to={toPath(`/profile/${entry.username}`)}
              className={cn(
                'min-w-0 flex-1 truncate',
                isMe ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)] hover:text-[var(--color-accent)]',
              )}
            >
              {entry.username}
              {entry.teamName && (
                <span className="ml-2 text-xs text-[var(--color-text-muted)]">· {entry.teamName}</span>
              )}
            </Link>
            <span className="hidden shrink-0 text-xs text-[var(--color-text-secondary)] sm:inline">
              {entry.solvedCount} solved
            </span>
            <span className={cn('shrink-0 text-xs', isMe ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]')}>
              {formatNumber(entry.xp)} xp
            </span>
          </div>
        );
      })}
    </div>
  );
}
