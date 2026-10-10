import { useState } from 'react';
import { Users } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { TeamCard } from './components/TeamCard';
import { TeamHub } from './components/TeamHub';
import { CreateOrJoinTeam } from './components/CreateOrJoinTeam';
import { ObservatoryLoader } from '@/components/feedback/ObservatoryLoader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useMyTeam, useTeamsList } from './hooks/useTeams';

export function TeamsPage() {
  const myTeamQuery = useMyTeam();
  const [page, setPage] = useState(1);
  const browseQuery = useTeamsList(page);

  if (myTeamQuery.isLoading) {
    return (
      <PageContainer>
        <ObservatoryLoader label="Loading your operation" />
      </PageContainer>
    );
  }

  if (myTeamQuery.isError) {
    return (
      <PageContainer>
        <ErrorState onRetry={() => myTeamQuery.refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">Teams</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Join forces with other operators to compete as a unit.
        </p>
      </div>

      {myTeamQuery.data ? (
        <TeamHub team={myTeamQuery.data} />
      ) : (
        <div className="flex flex-col gap-8">
          <CreateOrJoinTeam />

          <div>
            <h2 className="mb-4 font-display text-lg font-semibold text-[var(--color-text-primary)]">
              Browse teams
            </h2>

            {browseQuery.isLoading && <ObservatoryLoader label="Loading teams" />}

            {browseQuery.isError && <ErrorState onRetry={() => browseQuery.refetch()} />}

            {browseQuery.data && browseQuery.data.teams.length === 0 && (
              <EmptyState
                icon={Users}
                title="No teams yet"
                description="Be the first to create one — your invite code appears immediately."
              />
            )}

            {browseQuery.data && browseQuery.data.teams.length > 0 && (
              <>
                <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2 @lg:grid-cols-3">
                  {browseQuery.data.teams.map((team) => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </div>

                {browseQuery.data.pagination.totalPages > 1 && (
                  <nav className="mt-4 flex items-center justify-center gap-2" aria-label="Pagination">
                    {Array.from({ length: browseQuery.data.pagination.totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i + 1)}
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
                )}
              </>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
