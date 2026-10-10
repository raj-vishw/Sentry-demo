import { useQuery } from '@tanstack/react-query';
import { Flag, Flame, Trophy, Zap } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatCard } from './components/StatCard';
import { RecentSolvesList } from './components/RecentSolvesList';
import { RecommendedChallenges } from './components/RecommendedChallenges';
import { ObservatoryGraph } from './components/ObservatoryGraph';
import { challengeService } from '@/services/challengeService';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { ObservatoryLoader } from '@/components/feedback/ObservatoryLoader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { FadeIn } from '@/components/animation/FadeIn';

export function DashboardPage() {
  const profileQuery = useProfile();
  // Two small, purpose-built backend queries — not "fetch everything and
  // slice in the browser" (see Phase 3 spec §40-41: a deterministic
  // backend query is enough, no need for anything fancier).
  const recommendedQuery = useQuery({
    queryKey: ['challenges', 'recommended'],
    queryFn: () => challengeService.list({ solved: 'unsolved', sort: 'newest', limit: 3 }),
  });
  const recentlyAddedQuery = useQuery({
    queryKey: ['challenges', 'recently-added'],
    queryFn: () => challengeService.list({ sort: 'newest', limit: 3 }),
  });

  const isLoading = profileQuery.isLoading || recommendedQuery.isLoading || recentlyAddedQuery.isLoading;
  const isError = profileQuery.isError || recommendedQuery.isError || recentlyAddedQuery.isError;

  if (isLoading) {
    return (
      <PageContainer>
        <ObservatoryLoader label="Charting your observatory" />
      </PageContainer>
    );
  }

  if (isError || !profileQuery.data || !recommendedQuery.data || !recentlyAddedQuery.data) {
    return (
      <PageContainer>
        <ErrorState onRetry={() => profileQuery.refetch()} />
      </PageContainer>
    );
  }

  const { user, recentSolves, categoryProgress } = profileQuery.data;

  return (
    <PageContainer className="flex flex-col gap-10">
      <FadeIn className="text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-accent)]">
          Welcome back, {user.username}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
          Your Cyber Observatory
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--color-text-secondary)]">
          Every solved challenge expands your map. Hover a region to see how far you've explored.
        </p>
      </FadeIn>

      <div className="grid grid-cols-2 gap-3 @sm:mx-auto @sm:max-w-xl @lg:grid-cols-4">
        <StatCard icon={Zap} label="XP" value={user.xp.toLocaleString()} />
        <StatCard icon={Trophy} label="Global Rank" value={`#${user.rank}`} accent="secondary" />
        <StatCard icon={Flag} label="Solved" value={String(user.solvedCount)} />
        <StatCard icon={Flame} label="Streak" value={`${user.streak}d`} accent="secondary" />
      </div>

      <FadeIn delay={0.1}>
        <ObservatoryGraph progress={categoryProgress} />
      </FadeIn>

      <div className="grid grid-cols-1 gap-6 @lg:grid-cols-2">
        <RecentSolvesList solves={recentSolves} />
        <RecommendedChallenges challenges={recommendedQuery.data.challenges} />
      </div>

      <RecommendedChallenges
        challenges={recentlyAddedQuery.data.challenges}
        title="Recently added"
        emptyDescription="No challenges published yet."
      />
    </PageContainer>
  );
}
