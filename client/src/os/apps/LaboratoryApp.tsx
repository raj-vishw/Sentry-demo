import { useEffect } from 'react';
import { ChallengeWorkspace } from '@/features/challenges/components/ChallengeWorkspace';
import { useChallenge } from '@/features/challenges/hooks/useChallenge';
import { useWindowStore } from '../state/windowStore';
import type { AppContentProps } from '../types';

export function LaboratoryApp({ windowId, params, isCompact }: AppContentProps) {
  const slug = params.slug;
  const { data: challenge } = useChallenge(slug);
  const setWindowTitle = useWindowStore((s) => s.setWindowTitle);

  useEffect(() => {
    if (challenge?.title) setWindowTitle(windowId, challenge.title);
  }, [challenge?.title, windowId, setWindowTitle]);

  return (
    <div className="@container p-4 sm:p-6">
      <ChallengeWorkspace slug={slug} dense={isCompact} />
    </div>
  );
}
