import { apiClient } from '@/lib/apiClient';

export interface DocNavItem {
  slug: string;
  title: string;
}

export interface DocNavGroup {
  label: string;
  items: DocNavItem[];
}

export interface DocContent {
  slug: string;
  title: string;
  content: string;
}

export const docsService = {
  async list(): Promise<DocNavGroup[]> {
    const { groups } = await apiClient.get<{ groups: DocNavGroup[] }>('/public/docs');
    return groups;
  },

  async get(slug: string): Promise<DocContent | null> {
    try {
      const { doc } = await apiClient.get<{ doc: DocContent }>(`/public/docs/${slug}`);
      return doc;
    } catch {
      return null;
    }
  },
};
