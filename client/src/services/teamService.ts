import type { CategoryProgress, Pagination, Team, TeamRole, TeamSummary } from '@/types';
import { apiClient } from '@/lib/apiClient';

interface BackendTeamMember {
  userId: string;
  username: string;
  avatar: string | null;
  role: 'OWNER' | 'MEMBER';
  points: number;
  solvedCount: number;
  joinedAt: string;
}

interface BackendTeamSummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatar: string | null;
  points: number;
  solvedCount: number;
  memberCount: number;
  createdAt: string;
  hidden: boolean;
}

interface BackendTeamDetail extends BackendTeamSummary {
  inviteCode: string | null;
  members: BackendTeamMember[];
  categoryProgress: { category: string; solved: number; total: number }[];
}

function toRole(role: 'OWNER' | 'MEMBER'): TeamRole {
  return role === 'OWNER' ? 'owner' : 'member';
}

function toSummary(t: BackendTeamSummary): TeamSummary {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    avatarUrl: t.avatar ?? undefined,
    xp: t.points,
    solvedCount: t.solvedCount,
    memberCount: t.memberCount,
    createdAt: t.createdAt,
    hidden: t.hidden,
  };
}

function toTeam(t: BackendTeamDetail): Team {
  return {
    ...toSummary(t),
    inviteCode: t.inviteCode,
    members: t.members.map((m) => ({
      userId: m.userId,
      username: m.username,
      avatarUrl: m.avatar ?? undefined,
      role: toRole(m.role),
      xp: m.points,
      solvedCount: m.solvedCount,
      joinedAt: m.joinedAt,
    })),
    categoryProgress: t.categoryProgress as CategoryProgress[],
  };
}

export const teamService = {
  async list(page = 1, limit = 20): Promise<{ teams: TeamSummary[]; pagination: Pagination }> {
    const res = await apiClient.get<{ teams: BackendTeamSummary[]; pagination: Pagination }>(
      `/teams?page=${page}&limit=${limit}`,
    );
    return { teams: res.teams.map(toSummary), pagination: res.pagination };
  },

  async getMine(): Promise<Team | null> {
    const { team } = await apiClient.get<{ team: BackendTeamDetail | null }>('/teams/mine');
    return team ? toTeam(team) : null;
  },

  async getBySlug(slug: string): Promise<Team> {
    const { team } = await apiClient.get<{ team: BackendTeamDetail }>(`/teams/${slug}`);
    return toTeam(team);
  },

  async create(input: { name: string; description?: string; avatar?: string }): Promise<Team> {
    const { team } = await apiClient.post<{ team: BackendTeamDetail }>('/teams', input);
    return toTeam(team);
  },

  async update(input: { description?: string; avatar?: string | null }): Promise<Team> {
    const { team } = await apiClient.patch<{ team: BackendTeamDetail }>('/teams/mine', input);
    return toTeam(team);
  },

  async join(inviteCode: string): Promise<Team> {
    const { team } = await apiClient.post<{ team: BackendTeamDetail }>('/teams/join', { inviteCode });
    return toTeam(team);
  },

  async leave(): Promise<{ disbanded: boolean }> {
    return apiClient.post('/teams/leave');
  },

  async removeMember(userId: string): Promise<Team> {
    const { team } = await apiClient.delete<{ team: BackendTeamDetail }>(`/teams/mine/members/${userId}`);
    return toTeam(team);
  },

  async transferOwnership(userId: string): Promise<Team> {
    const { team } = await apiClient.post<{ team: BackendTeamDetail }>(`/teams/mine/transfer/${userId}`);
    return toTeam(team);
  },

  async regenerateInviteCode(): Promise<Team> {
    const { team } = await apiClient.post<{ team: BackendTeamDetail }>('/teams/mine/invite-code/regenerate');
    return toTeam(team);
  },

  async disband(): Promise<void> {
    await apiClient.delete('/teams/mine');
  },
};
