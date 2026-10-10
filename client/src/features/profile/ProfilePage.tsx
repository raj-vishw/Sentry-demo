import { Calendar, Flag, Flame, Trophy, Zap } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { ObservatoryGraph } from '@/features/dashboard/components/ObservatoryGraph';
import { BadgeGrid } from './components/BadgeGrid';
import { useAuthStore } from '@/stores/authStore';
import { useProfile } from './hooks/useProfile';
import { ObservatoryLoader } from '@/components/feedback/ObservatoryLoader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { FadeIn } from '@/components/animation/FadeIn';

export function ProfilePage() {
  const sessionUser = useAuthStore((s) => s.user);
  const { data, isLoading, isError, refetch } = useProfile();

  if (!sessionUser) return null;

  if (isLoading) {
    return (
      <PageContainer>
        <ObservatoryLoader label="Reconstructing your journey" />
      </PageContainer>
    );
  }

  if (isError || !data) {
    return (
      <PageContainer>
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  const { user, categoryProgress, badges } = data;

  return (
    <PageContainer className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-full bg-[var(--color-surface-elevated)] font-mono text-xl font-semibold text-[var(--color-accent)]">
          {user.username.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
            {user.username}
          </h1>
          <p className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
            <Calendar className="size-3.5" />
            Joined {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 @lg:grid-cols-4">
        <StatCard icon={Zap} label="XP" value={user.xp.toLocaleString()} />
        <StatCard icon={Trophy} label="Global Rank" value={`#${user.rank}`} accent="secondary" />
        <StatCard icon={Flag} label="Solved" value={String(user.solvedCount)} />
        <StatCard icon={Flame} label="Streak" value={`${user.streak}d`} accent="secondary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Badges</CardTitle>
        </CardHeader>
        <CardContent>
          <BadgeGrid badges={badges} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between border-b border-[var(--color-glass-border)] pb-3">
            <span className="text-[var(--color-text-secondary)]">Email</span>
            <span className="text-[var(--color-text-primary)]">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-secondary)]">Role</span>
            <span className="font-mono uppercase text-[var(--color-text-primary)]">{user.role}</span>
          </div>
        </CardContent>
      </Card>

      <FadeIn className="text-center">
        <h2 className="font-display text-xl font-semibold text-[var(--color-text-primary)]">
          Your Knowledge Graph
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-text-secondary)]">
          A map of what you've explored so far.
        </p>
        <div className="mt-6">
          <ObservatoryGraph progress={categoryProgress} />
        </div>
      </FadeIn>
    </PageContainer>
  );
}
