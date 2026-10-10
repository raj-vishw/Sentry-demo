import { Link } from 'react-router-dom';
import type { LeaderboardEntry } from '@/types';
import { RankBadge } from './RankBadge';
import { formatNumber, cn } from '@/lib/utils';
import { useAppAwarePath } from '@/lib/appPath';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Trophy } from 'lucide-react';

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
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-left text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            <th className="px-4 py-3 font-medium">Rank</th>
            <th className="px-4 py-3 font-medium">Operator</th>
            <th className="hidden px-4 py-3 font-medium sm:table-cell">Team</th>
            <th className="px-4 py-3 text-right font-medium">Solved</th>
            <th className="px-4 py-3 text-right font-medium">XP</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.userId}
              className={cn(
                'border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-hover)]',
                entry.userId === highlightUserId ? 'bg-[var(--color-accent-soft)]' : 'bg-[var(--color-surface)]',
              )}
            >
              <td className="px-4 py-3">
                <RankBadge rank={entry.rank} />
              </td>
              <td className="px-4 py-3 font-medium">
                <Link
                  to={toPath(`/profile/${entry.username}`)}
                  className="text-[var(--color-text-primary)] hover:text-[var(--color-accent)]"
                >
                  {entry.username}
                </Link>
              </td>
              <td className="hidden px-4 py-3 text-[var(--color-text-secondary)] sm:table-cell">
                {entry.teamName ?? '—'}
              </td>
              <td className="px-4 py-3 text-right text-[var(--color-text-secondary)]">{entry.solvedCount}</td>
              <td className="px-4 py-3 text-right font-mono font-medium text-[var(--color-accent)]">
                {formatNumber(entry.xp)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
