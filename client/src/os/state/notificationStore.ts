import { create } from 'zustand';

export interface OsNotification {
  id: string;
  category: 'system' | 'laboratory' | 'security' | 'announcement';
  title: string;
  message: string;
  time: number;
  read: boolean;
}

interface NotificationState {
  notifications: OsNotification[];
  push: (n: Omit<OsNotification, 'id' | 'time' | 'read'>) => void;
  markAllRead: () => void;
  clear: () => void;
}

const MAX_NOTIFICATIONS = 30;

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],
  push: (n) =>
    set((s) => ({
      notifications: [
        { ...n, id: crypto.randomUUID(), time: Date.now(), read: false },
        ...s.notifications,
      ].slice(0, MAX_NOTIFICATIONS),
    })),
  markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
  clear: () => set({ notifications: [] }),
}));
