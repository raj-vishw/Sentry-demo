import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { announcementService } from '@/services/announcementService';
import { useAnnouncementSeenStore } from '@/os/state/announcementStore';
import { useNotificationStore } from '@/os/state/notificationStore';

const POLL_INTERVAL_MS = 60_000;

/**
 * The one place that turns server-authored announcements into client
 * notifications. Mounted once in OSShell, which covers both "catch up on
 * anything posted while I was logged out/offline" (the query fires
 * immediately on mount, every session/reload) and "keep checking while
 * the OS stays open" (refetchInterval) — no separate boot-time fetch
 * needed. Simple polling, not WebSockets/SSE: this is the first
 * server-driven notification source, and the project has no push-
 * transport infrastructure anywhere else to build on.
 */
export function useAnnouncementPolling() {
  const lastSeenAt = useAnnouncementSeenStore((s) => s.lastSeenAt);
  const markSeen = useAnnouncementSeenStore((s) => s.markSeen);
  const pushNotification = useNotificationStore((s) => s.push);

  const { data } = useQuery({
    queryKey: ['announcements-poll'],
    queryFn: () => announcementService.listRecent(lastSeenAt ?? undefined),
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!data || data.length === 0) return;
    // API returns newest-first; push oldest-first so the notification
    // center ends up with the newest on top, matching push()'s own
    // prepend order.
    for (const announcement of [...data].reverse()) {
      pushNotification({ category: 'announcement', title: 'Announcement', message: announcement.message });
      markSeen(announcement.createdAt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
}
