import type { AuthCredentials, RegisterPayload, User } from '@/types';
import { apiClient, ADMIN_PREFIX } from '@/lib/apiClient';

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

interface AuthResponse {
  user: BackendUser;
  accessToken: string;
}

interface RegisterResponse {
  user: BackendUser;
  pending: boolean;
  accessToken?: string;
}

export const authService = {
  async login(credentials: AuthCredentials): Promise<{ user: User; token: string }> {
    const res = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return { user: toFrontendUser(res.user), token: res.accessToken };
  },

  /** Only ADMIN accounts can authenticate here — the backend rejects USER
   * accounts on this route the same way it rejects ADMIN accounts on
   * `login()` above. See server/src/services/auth.service.ts. */
  async adminLogin(credentials: AuthCredentials): Promise<{ user: User; token: string }> {
    const res = await apiClient.post<AuthResponse>(`/${ADMIN_PREFIX}/login`, credentials);
    return { user: toFrontendUser(res.user), token: res.accessToken };
  },

  async register(
    payload: RegisterPayload,
  ): Promise<{ user: User; pending: boolean; token?: string }> {
    const res = await apiClient.post<RegisterResponse>('/auth/register', payload);
    return { user: toFrontendUser(res.user), pending: res.pending, token: res.accessToken };
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  /**
   * Called once on app boot. The HttpOnly refresh cookie (if any) is sent
   * automatically; a successful response means there's a valid prior
   * session to restore. Failure just means "not logged in" — never thrown
   * as an error the UI needs to react to.
   */
  async restoreSession(): Promise<{ user: User; token: string } | null> {
    try {
      const res = await apiClient.post<AuthResponse>('/auth/refresh');
      return { user: toFrontendUser(res.user), token: res.accessToken };
    } catch {
      return null;
    }
  },
};
