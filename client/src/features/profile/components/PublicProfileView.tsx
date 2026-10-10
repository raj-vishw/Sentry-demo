import { Calendar, Flag, Trophy, Zap, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { BadgeGrid } from './BadgeGrid';
import { WriteupCard } from '@/features/writeups/components/WriteupCard';
import { ObservatoryLoader } from '@/components/feedback/ObservatoryLoader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { usePublicProfile } from '../hooks/usePublicProfile';

/**
 * The actual profile content, shared between the standalone public route
 * (PublicProfilePage, wrapped in PageContainer) and the OS window version
 * (PublicProfileApp) — same split as ChallengeWorkspace/ChallengeDetailPage.
 */
export function PublicProfileView({ username }: { username: string }) {
  const { data: profile, isLoading, isError, refetch } = usePublicProfile(username);

  if (isLoading) {
    return <ObservatoryLoader label="Loading operator profile" />;
  }

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  if (!profile) {
    return <EmptyState icon={Flag} title="Operator not found" description="No account exists under that username." />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-full bg-[var(--color-surface-elevated)] font-mono text-xl font-semibold text-[var(--color-accent)]">
          {profile.username.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">{profile.username}</h1>
          <p className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
            <Calendar className="size-3.5" />
            Joined {new Date(profile.createdAt).toLocaleDateString()}
            {profile.teamName && <span>· {profile.teamName}</span>}
          </p>
        </div>
      </div>

      {profile.bio && <p className="text-sm text-[var(--color-text-secondary)]">{profile.bio}</p>}

      <div className="grid grid-cols-2 gap-4 @lg:grid-cols-3">
        <StatCard icon={Zap} label="XP" value={profile.points.toLocaleString()} />
        <StatCard icon={Trophy} label="Global Rank" value={`#${profile.rank}`} accent="secondary" />
        <StatCard icon={Flag} label="Solved" value={String(profile.solvedCount)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Badges</CardTitle>
        </CardHeader>
        <CardContent>
          <BadgeGrid badges={profile.badges} />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 font-display text-lg font-semibold text-[var(--color-text-primary)]">Writeups</h2>
        {profile.writeups.length === 0 ? (
          <EmptyState icon={FileText} title="No published writeups yet" />
        ) : (
          <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2 @lg:grid-cols-3">
            {profile.writeups.map((writeup) => (
              <WriteupCard key={writeup.id} writeup={writeup} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
