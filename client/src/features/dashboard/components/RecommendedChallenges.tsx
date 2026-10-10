import type { Challenge } from '@/types';
import { ChallengeCard } from '@/features/challenges/components/ChallengeCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Compass } from 'lucide-react';

export function RecommendedChallenges({
  challenges,
  title = 'Recommended for you',
  emptyDescription = "You've solved everything currently unsolved here — check back soon.",
}: {
  challenges: Challenge[];
  title?: string;
  emptyDescription?: string;
}) {
  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>
      {challenges.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={Compass} title="Nothing here yet" description={emptyDescription} />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {challenges.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      )}
    </div>
  );
}
