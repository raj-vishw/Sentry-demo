import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/PageContainer';
import { Tabs } from '@/components/ui/Tabs';
import { LeaderboardTable } from './components/LeaderboardTable';
import { RankBadge } from './components/RankBadge';
import { ObservatoryLoader } from '@/components/feedback/ObservatoryLoader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { leaderboardService, type LeaderboardScope } from '@/services/leaderboardService';
import { formatNumber } from '@/lib/utils';
import { Lock, Snowflake, Trophy, Users, Zap } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const PAGE_SIZE = 20;

export function LeaderboardPage() {
  useDocumentTitle('Leaderboard');
  return (
    <PageContainer className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
          Leaderboard
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Operators and teams ranked by total XP.
        </p>
      </div>

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

function PaginationNav({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
      {Array.from({ length: totalPages }).map((_, i) => (
        <button
          key={i}
          onClick={() => onChange(i + 1)}
          aria-current={page === i + 1 ? 'page' : undefined}
          className={`size-9 rounded-[var(--radius-md)] font-mono text-sm ${
            page === i + 1
              ? 'bg-[var(--color-accent)] text-[var(--color-text-inverse)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]'
          }`}
        >
          {i + 1}
        </button>
      ))}
    </nav>
  );
}

function LeaderboardPanel({ scope }: { scope: LeaderboardScope }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['leaderboard', scope, page],
    queryFn: () => leaderboardService.getLeaderboard(scope, page, PAGE_SIZE),
  });

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

      <PaginationNav page={page} totalPages={data.pagination.totalPages} onChange={setPage} />
    </div>
  );
}

function TeamLeaderboardPanel() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['leaderboard', 'teams', page],
    queryFn: () => leaderboardService.getTeamLeaderboard(page, PAGE_SIZE),
  });

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
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-left text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">Team</th>
              <th className="px-4 py-3 text-right font-medium">Members</th>
              <th className="px-4 py-3 text-right font-medium">Solved</th>
              <th className="px-4 py-3 text-right font-medium">XP</th>
            </tr>
          </thead>
          <tbody>
            {data.entries.map((entry) => (
              <tr
                key={entry.teamId}
                className="border-b border-[var(--color-border)] bg-[var(--color-surface)] last:border-0 hover:bg-[var(--color-surface-hover)]"
              >
                <td className="px-4 py-3">
                  <RankBadge rank={entry.rank} />
                </td>
                <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{entry.name}</td>
                <td className="px-4 py-3 text-right text-[var(--color-text-secondary)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-3.5" /> {entry.memberCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-[var(--color-text-secondary)]">{entry.solvedCount}</td>
                <td className="px-4 py-3 text-right font-mono font-medium text-[var(--color-accent)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Zap className="size-3.5" /> {formatNumber(entry.xp)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginationNav page={page} totalPages={data.pagination.totalPages} onChange={setPage} />
    </div>
  );
}
