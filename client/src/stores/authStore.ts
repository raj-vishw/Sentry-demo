import { create } from 'zustand';
import type { User } from '@/types';
import { configureApiClient } from '@/lib/apiClient';
import { useMaintenanceStore } from './maintenanceStore';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  /** True until the initial session-restoration attempt (silent refresh) completes. */
  isInitializing: boolean;
  setSession: (user: User, accessToken: string) => void;
  clearSession: () => void;
  finishInitializing: () => void;
}

/**
 * Deliberately NOT persisted to localStorage — the access token lives only
 * in memory for the life of the tab. A page reload starts with no token and
 * relies on the HttpOnly refresh cookie (via authService.restoreSession) to
 * silently re-establish a session. See server/README.md "Authentication
 * Architecture" for the full rationale.
 */
export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitializing: true,
  setSession: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
  clearSession: () => set({ user: null, accessToken: null, isAuthenticated: false }),
  finishInitializing: () => set({ isInitializing: false }),
}));

configureApiClient({
  getAccessToken: () => useAuthStore.getState().accessToken,
  onUnauthorized: () => useAuthStore.getState().clearSession(),
  onMaintenanceMode: () => useMaintenanceStore.getState().setActive(true),
});
