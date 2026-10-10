import type { RegisterPayload, User } from '@/types';
import { apiClient } from '@/lib/apiClient';

interface BackendUser {
  id: string;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
  avatar: string | null;
  bio: string;
  points: number;
  rank: number;
  solvedCount: number;
  streak: number;
  teamId: string | null;
  teamName: string | null;
  createdAt: string;
}

function toFrontendUser(user: BackendUser): User {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role === 'ADMIN' ? 'admin' : 'user',
    avatarUrl: user.avatar ?? undefined,
    xp: user.points,
    rank: user.rank,
    solvedCount: user.solvedCount,
    streak: user.streak,
    teamId: user.teamId,
    teamName: user.teamName,
    createdAt: user.createdAt,
  };
}

export const setupService = {
  /** Polled once on app boot — false once an admin already exists via a prior wizard run. */
  async getStatus(): Promise<{ completed: boolean }> {
    return apiClient.get('/setup/status');
  },

  async initialize(payload: RegisterPayload): Promise<{ user: User; token: string }> {
    const res = await apiClient.post<{ user: BackendUser; accessToken: string }>('/setup/initialize', payload);
    return { user: toFrontendUser(res.user), token: res.accessToken };
  },
};
