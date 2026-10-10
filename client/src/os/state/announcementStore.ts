import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Tracks the newest announcement createdAt this browser has already
// surfaced, so a boot-time fetch and periodic polling don't re-push the
// same announcement into notificationStore (which is deliberately
// non-persistent) on every reload.
interface AnnouncementSeenState {
  lastSeenAt: string | null;
  markSeen: (createdAt: string) => void;
}

export const useAnnouncementSeenStore = create<AnnouncementSeenState>()(
  persist(
    (set, get) => ({
      lastSeenAt: null,
      markSeen: (createdAt) => {
        const current = get().lastSeenAt;
        if (!current || new Date(createdAt) > new Date(current)) {
          set({ lastSeenAt: createdAt });
        }
      },
    }),
    { name: 'announcements:last-seen:v1' },
  ),
);
