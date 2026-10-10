import { useAuthStore } from '@/stores/authStore';

/** Thin selector — the session is already held in authStore post-login/restore. */
export function useCurrentUser() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return { user, isAuthenticated };
}
