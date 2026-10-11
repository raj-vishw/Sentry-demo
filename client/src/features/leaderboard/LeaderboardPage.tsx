import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Tabs } from '@/components/ui/Tabs';
import { Pagination } from '@/components/ui/Pagination';
import { LeaderboardTable } from './components/LeaderboardTable';
import { RankBadge } from './components/RankBadge';
import { ObservatoryLoader } from '@/components/feedback/ObservatoryLoader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useLeaderboard, useTeamLeaderboard } from './hooks/useLeaderboard';
import type { LeaderboardScope } from '@/services/leaderboardService';
import { formatNumber, cn } from '@/lib/utils';
import { Lock, Snowflake, Trophy, Users, Zap } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const PAGE_SIZE = 20;

/** See ChallengesPage.tsx's matching doc comment — same hideHeader convention. */
export function LeaderboardPage({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  useDocumentTitle('Leaderboard');
  return (
    <PageContainer className={cn('flex flex-col gap-4', hideHeader && 'px-3 py-4 sm:px-4')}>
      {!hideHeader && (
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
            Leaderboard
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Operators and teams ranked by total XP.
          </p>
        </div>
      )}

      <Tabs
        items={[
          { value: 'global', label: 'Global' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
          { value: 'teams', label: 'Teams' },
        ]}
      >
        {(active) =>
          active === 'teams' ? <TeamLeaderboardPanel /> : <LeaderboardPanel scope={active as LeaderboardScope} />
        }
      </Tabs>
    </PageContainer>
  );
}

function FrozenBanner({ freezeTime }: { freezeTime: string | null }) {
  return (
    <GlassPanel className="flex items-center gap-3 p-4 text-sm text-[var(--color-text-secondary)]">
      <Snowflake className="size-4 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
      <span>
        Standings are frozen{freezeTime ? ` as of ${new Date(freezeTime).toLocaleString()}` : ''} — new solves
        still count, they just aren't reflected here yet.
      </span>
    </GlassPanel>
  );
}

function LeaderboardPanel({ scope }: { scope: LeaderboardScope }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useLeaderboard(scope, page, PAGE_SIZE);

  if (isLoading) return <ObservatoryLoader label="Loading leaderboard" />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;
  if (data.hidden) {
    return (
      <EmptyState
        icon={Lock}
        title="Leaderboard hidden"
        description="Standings are hidden until the competition ends."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {data.frozen && <FrozenBanner freezeTime={data.freezeTime} />}
      {data.me && !data.me.onPage && (
        <GlassPanel className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <RankBadge rank={data.me.rank} />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
                Your position
              </p>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{data.me.username}</p>
            </div>
          </div>
          <span className="font-mono text-sm font-medium text-[var(--color-accent)]">
            {formatNumber(data.me.xp)} XP
          </span>
        </GlassPanel>
      )}

      <LeaderboardTable entries={data.entries} highlightUserId={data.me?.onPage ? data.me.userId : undefined} />

      <Pagination page={page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
    </div>
  );
}

function TeamLeaderboardPanel() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useTeamLeaderboard(page, PAGE_SIZE);

  if (isLoading) return <ObservatoryLoader label="Loading team leaderboard" />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;
  if (data.hidden) {
    return (
      <EmptyState
        icon={Lock}
        title="Leaderboard hidden"
        description="Standings are hidden until the competition ends."
      />
    );
  }
  if (data.entries.length === 0) {
    return <EmptyState icon={Trophy} title="No teams yet" description="Create a team to see it ranked here." />;
  }

  return (
    <div className="flex flex-col gap-4">
      {data.frozen && <FrozenBanner freezeTime={data.freezeTime} />}
      <div className="flex flex-col border-t border-[var(--color-border)] font-mono text-sm">
        {data.entries.map((entry) => (
          <div
            key={entry.teamId}
            className="flex items-center gap-4 border-b border-[var(--color-border)] px-3 py-2.5 hover:bg-[var(--color-surface-hover)]"
          >
            <span className="w-7 shrink-0 text-xs text-[var(--color-text-muted)]">
              {String(entry.rank).padStart(2, '0')}
            </span>
            <span className="min-w-0 flex-1 truncate text-[var(--color-text-primary)]">{entry.name}</span>
            <span className="hidden shrink-0 items-center gap-1.5 text-xs text-[var(--color-text-secondary)] sm:inline-flex">
              <Users className="size-3.5" /> {entry.memberCount}
            </span>
            <span className="hidden shrink-0 text-xs text-[var(--color-text-secondary)] sm:inline">
              {entry.solvedCount} solved
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-[var(--color-accent)]">
              <Zap className="size-3.5" /> {formatNumber(entry.xp)}
            </span>
          </div>
        ))}
      </div>

      <Pagination page={page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
    </div>
  );
}
