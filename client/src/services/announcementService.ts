import { apiClient } from '@/lib/apiClient';

export interface Announcement {
  id: string;
  message: string;
  createdAt: string;
}

export const announcementService = {
  async listRecent(since?: string): Promise<Announcement[]> {
    const query = since ? `?since=${encodeURIComponent(since)}` : '';
    const { announcements } = await apiClient.get<{ announcements: Announcement[] }>(`/public/announcements${query}`);
    return announcements;
  },
};
