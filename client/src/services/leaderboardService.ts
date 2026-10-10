import type { LeaderboardEntry, Pagination, TeamLeaderboardEntry } from '@/types';
import { apiClient } from '@/lib/apiClient';

export type LeaderboardScope = 'global' | 'weekly' | 'monthly';

interface BackendLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string | null;
  points: number;
  solvedCount: number;
  teamName: string | null;
}

interface BackendLeaderboardResponse {
  entries: BackendLeaderboardEntry[];
  pagination: Pagination;
  me: (BackendLeaderboardEntry & { onPage: boolean }) | null;
  hidden: boolean;
  frozen: boolean;
  freezeTime: string | null;
}

function toEntry(e: BackendLeaderboardEntry): LeaderboardEntry {
  return {
    rank: e.rank,
    userId: e.userId,
    username: e.username,
    avatarUrl: e.avatar ?? undefined,
    xp: e.points,
    solvedCount: e.solvedCount,
    teamName: e.teamName,
  };
}

interface BackendTeamLeaderboardEntry {
  rank: number;
  teamId: string;
  name: string;
  slug: string;
  avatar: string | null;
  points: number;
  solvedCount: number;
  memberCount: number;
}

export const leaderboardService = {
  async getLeaderboard(
    scope: LeaderboardScope = 'global',
    page = 1,
    limit = 20,
  ): Promise<{
    entries: LeaderboardEntry[];
    pagination: Pagination;
    me: (LeaderboardEntry & { onPage: boolean }) | null;
    hidden: boolean;
    frozen: boolean;
    freezeTime: string | null;
  }> {
    const res = await apiClient.get<BackendLeaderboardResponse>(
      `/leaderboard?scope=${scope}&page=${page}&limit=${limit}`,
    );
    return {
      entries: res.entries.map(toEntry),
      pagination: res.pagination,
      me: res.me ? { ...toEntry(res.me), onPage: res.me.onPage } : null,
      hidden: res.hidden,
      frozen: res.frozen,
      freezeTime: res.freezeTime,
    };
  },

  async getTeamLeaderboard(
    page = 1,
    limit = 20,
  ): Promise<{
    entries: TeamLeaderboardEntry[];
    pagination: Pagination;
    hidden: boolean;
    frozen: boolean;
    freezeTime: string | null;
  }> {
    const res = await apiClient.get<{
      entries: BackendTeamLeaderboardEntry[];
      pagination: Pagination;
      hidden: boolean;
      frozen: boolean;
      freezeTime: string | null;
    }>(`/leaderboard/teams?page=${page}&limit=${limit}`);
    return {
      hidden: res.hidden,
      frozen: res.frozen,
      freezeTime: res.freezeTime,
      entries: res.entries.map((e) => ({
        rank: e.rank,
        teamId: e.teamId,
        name: e.name,
        slug: e.slug,
        avatarUrl: e.avatar ?? undefined,
        xp: e.points,
        solvedCount: e.solvedCount,
        memberCount: e.memberCount,
      })),
      pagination: res.pagination,
    };
  },
};
