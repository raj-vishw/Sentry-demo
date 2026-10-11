import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import type { Challenge } from '@/types';
import { CATEGORY_META, DIFFICULTY_META } from '@/lib/categories';
import { useAppAwarePath } from '@/lib/appPath';
import { cn } from '@/lib/utils';

/**
 * A compact terminal-manifest row — "// CHALLENGES.SYS" — not a card grid:
 * a small category-colored bullet, the title, and either the point value
 * or a solved checkmark flush right, divided from its neighbors by a
 * hairline. Matches the same row rhythm as LeaderboardTable and the
 * FeatureSection manifest on the public site.
 */
export function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const toPath = useAppAwarePath();
  const category = CATEGORY_META[challenge.category];
  const difficulty = DIFFICULTY_META[challenge.difficulty];

  return (
    <Link
      to={toPath(`/challenges/${challenge.slug}`)}
      className={cn(
        'group flex items-center gap-3 border-b border-[var(--color-border)] px-1 py-3 font-mono text-sm transition-colors last:border-0',
        'hover:bg-[var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
        challenge.locked && 'opacity-50',
      )}
    >
      <span
        className="size-1.5 shrink-0"
        style={{ backgroundColor: challenge.locked ? 'var(--color-text-muted)' : difficulty.color }}
        aria-hidden="true"
      />
      <span className="sr-only">{challenge.locked ? 'locked' : `${difficulty.label} difficulty`}</span>
      <span className="shrink-0 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
        [{category.name}]
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 truncate lowercase text-[var(--color-text-primary)]',
          !challenge.locked && 'group-hover:text-[var(--color-accent)]',
        )}
      >
        {challenge.title}
      </span>

      {challenge.locked ? (
        <Lock className="size-3.5 shrink-0 text-[var(--color-text-muted)]" aria-label="Locked" />
      ) : challenge.solved ? (
        <span className="shrink-0 text-xs text-[var(--color-success)]">✓ solved</span>
      ) : (
        <span className="shrink-0 text-xs text-[var(--color-text-secondary)]">{challenge.points} pts</span>
      )}
    </Link>
  );
}
