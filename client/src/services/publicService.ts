import type { Category, PlatformStats } from '@/types';
import { apiClient } from '@/lib/apiClient';

export const publicService = {
  async getStats(): Promise<PlatformStats> {
    return apiClient.get<PlatformStats>('/public/stats');
  },

  async getCategoryCounts(): Promise<Record<Category, number>> {
    return apiClient.get<Record<Category, number>>('/public/category-counts');
  },
};
