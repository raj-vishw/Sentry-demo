import { apiClient } from '@/lib/apiClient';

export interface PageListItem {
  slug: string;
  title: string;
}

export interface PageContent {
  slug: string;
  title: string;
  content: string;
}

export const pageService = {
  async list(): Promise<PageListItem[]> {
    const { pages } = await apiClient.get<{ pages: PageListItem[] }>('/public/pages');
    return pages;
  },

  async get(slug: string): Promise<PageContent | null> {
    try {
      const { page } = await apiClient.get<{ page: PageContent }>(`/public/pages/${slug}`);
      return page;
    } catch {
      return null;
    }
  },
};
