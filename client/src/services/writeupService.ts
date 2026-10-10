import type { Pagination, WriteupDetail, WriteupListItem } from '@/types';
import { apiClient, ADMIN_PREFIX } from '@/lib/apiClient';

export interface ListWriteupsParams {
  search?: string;
  category?: string;
  author?: string;
  sort?: 'newest' | 'most-viewed' | 'most-liked';
  page?: number;
  limit?: number;
}

function buildQuery(params: object): string {
  const entries = Object.entries(params as Record<string, unknown>).filter(([, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

export const writeupService = {
  async list(params: ListWriteupsParams = {}): Promise<{ writeups: WriteupListItem[]; pagination: Pagination }> {
    return apiClient.get(`/writeups${buildQuery(params)}`);
  },

  async listMine(): Promise<{ writeups: WriteupListItem[] }> {
    return apiClient.get('/writeups/mine');
  },

  async getBySlug(slug: string): Promise<WriteupDetail | null> {
    try {
      const { writeup } = await apiClient.get<{ writeup: WriteupDetail }>(`/writeups/${slug}`);
      return writeup;
    } catch {
      return null;
    }
  },

  async create(input: { title: string; challengeId: string; content: string }): Promise<WriteupDetail> {
    const { writeup } = await apiClient.post<{ writeup: WriteupDetail }>('/writeups', input);
    return writeup;
  },

  async update(id: string, input: { title?: string; content?: string }): Promise<WriteupDetail> {
    const { writeup } = await apiClient.patch<{ writeup: WriteupDetail }>(`/writeups/${id}`, input);
    return writeup;
  },

  async submitForReview(id: string): Promise<WriteupDetail> {
    const { writeup } = await apiClient.post<{ writeup: WriteupDetail }>(`/writeups/${id}/submit`);
    return writeup;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/writeups/${id}`);
  },

  async toggleLike(id: string): Promise<{ liked: boolean; likesCount: number }> {
    return apiClient.post(`/writeups/${id}/like`);
  },

  // --- Admin moderation ---

  async listForAdmin(params: { status?: string; page?: number; limit?: number } = {}): Promise<{
    writeups: WriteupDetail[];
    pagination: Pagination;
  }> {
    return apiClient.get(`/${ADMIN_PREFIX}/writeups${buildQuery(params)}`);
  },

  async approve(id: string): Promise<WriteupDetail> {
    const { writeup } = await apiClient.post<{ writeup: WriteupDetail }>(`/${ADMIN_PREFIX}/writeups/${id}/approve`);
    return writeup;
  },

  async reject(id: string, reason: string): Promise<WriteupDetail> {
    const { writeup } = await apiClient.post<{ writeup: WriteupDetail }>(`/${ADMIN_PREFIX}/writeups/${id}/reject`, { reason });
    return writeup;
  },

  async archive(id: string): Promise<WriteupDetail> {
    const { writeup } = await apiClient.post<{ writeup: WriteupDetail }>(`/${ADMIN_PREFIX}/writeups/${id}/archive`);
    return writeup;
  },
};
