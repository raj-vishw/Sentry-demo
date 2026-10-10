import type { Achievement, CategoryProgress, PublicProfile, RecentSolve, User, WriteupListItem } from '@/types';
import { apiClient } from '@/lib/apiClient';

interface BackendSafeUser {
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

interface BackendProfileResponse {
  user: BackendSafeUser;
  recentSolves: { challengeId: string; title: string; category: string; points: number; solvedAt: string }[];
  categoryProgress: CategoryProgress[];
  badges: Achievement[];
}

export interface ProfileDetail {
  user: User;
  recentSolves: RecentSolve[];
  categoryProgress: CategoryProgress[];
  badges: Achievement[];
}

interface BackendPublicProfile {
  username: string;
  avatar: string | null;
  bio: string;
  points: number;
  rank: number;
  solvedCount: number;
  streak: number;
  teamName: string | null;
  createdAt: string;
  badges: Achievement[];
  writeups: WriteupListItem[];
}

function toFrontendUser(u: BackendSafeUser): User {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role === 'ADMIN' ? 'admin' : 'user',
    avatarUrl: u.avatar ?? undefined,
    xp: u.points,
    rank: u.rank,
    solvedCount: u.solvedCount,
    streak: u.streak,
    teamId: u.teamId,
    teamName: u.teamName,
    createdAt: u.createdAt,
  };
}

export const userService = {
  /** Single source of truth for the dashboard and profile pages alike. */
  async getProfile(): Promise<ProfileDetail> {
    const res = await apiClient.get<BackendProfileResponse>('/users/me');
    return {
      user: toFrontendUser(res.user),
      recentSolves: res.recentSolves.map((s) => ({
        id: s.challengeId,
        challengeTitle: s.title,
        category: s.category as RecentSolve['category'],
        points: s.points,
        solvedAt: s.solvedAt,
      })),
      categoryProgress: res.categoryProgress,
      badges: res.badges,
    };
  },

  async updateProfile(input: { bio?: string; avatar?: string | null }): Promise<User> {
    const { user } = await apiClient.patch<{ user: BackendSafeUser }>('/users/me', input);
    return toFrontendUser(user);
  },

  async getPublicProfile(username: string): Promise<PublicProfile | null> {
    try {
      const { profile } = await apiClient.get<{ profile: BackendPublicProfile }>(`/users/${username}`);
      return {
        username: profile.username,
        avatarUrl: profile.avatar ?? undefined,
        bio: profile.bio,
        points: profile.points,
        rank: profile.rank,
        solvedCount: profile.solvedCount,
        streak: profile.streak,
        teamName: profile.teamName,
        createdAt: profile.createdAt,
        badges: profile.badges,
        writeups: profile.writeups,
      };
    } catch {
      return null;
    }
  },
};
