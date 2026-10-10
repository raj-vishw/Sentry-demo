import { apiClient } from '@/lib/apiClient';

export interface PlatformConfig {
  platformName: string;
  platformDescription: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  accentColor: string | null;
  bootMessage: string | null;
  competitionName: string;
  startTime: string | null;
  endTime: string | null;
}

export const platformConfigService = {
  async get(): Promise<PlatformConfig> {
    return apiClient.get('/public/platform-config');
  },
};
