import type { Pagination, Report, ReportStatus } from '@/types';
import { apiClient, ADMIN_PREFIX } from '@/lib/apiClient';

function buildQuery(params: object): string {
  const entries = Object.entries(params as Record<string, unknown>).filter(([, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

export const reportService = {
  async create(input: { targetType: 'writeup'; targetId: string; reason: string }): Promise<Report> {
    const { report } = await apiClient.post<{ report: Report }>('/reports', input);
    return report;
  },

  // --- Admin review ---

  async list(params: { status?: ReportStatus; page?: number; limit?: number } = {}): Promise<{
    reports: Report[];
    pagination: Pagination;
  }> {
    return apiClient.get(`/${ADMIN_PREFIX}/reports${buildQuery(params)}`);
  },

  async resolve(id: string): Promise<Report> {
    const { report } = await apiClient.post<{ report: Report }>(`/${ADMIN_PREFIX}/reports/${id}/resolve`);
    return report;
  },

  async dismiss(id: string): Promise<Report> {
    const { report } = await apiClient.post<{ report: Report }>(`/${ADMIN_PREFIX}/reports/${id}/dismiss`);
    return report;
  },
};
