import { useEffect } from 'react';
import { PublicProfileView } from '@/features/profile/components/PublicProfileView';
import { usePublicProfile } from '@/features/profile/hooks/usePublicProfile';
import { useWindowStore } from '../state/windowStore';
import type { AppContentProps } from '../types';

export function PublicProfileApp({ windowId, params }: AppContentProps) {
  const username = params.username;
  const { data: profile } = usePublicProfile(username);
  const setWindowTitle = useWindowStore((s) => s.setWindowTitle);

  useEffect(() => {
    if (profile?.username) setWindowTitle(windowId, profile.username);
  }, [profile?.username, windowId, setWindowTitle]);

  return (
    <div className="@container p-4 sm:p-6">
      <PublicProfileView username={username} />
    </div>
  );
}
