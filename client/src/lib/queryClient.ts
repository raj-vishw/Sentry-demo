import { QueryCache, QueryClient, MutationCache } from '@tanstack/react-query';
import { ApiError } from './apiClient';
import { useUiStore } from '@/stores/uiStore';

/**
 * Centralized API error → toast mapping (spec: "Frontend Error Handling").
 * 401 is deliberately silent here — apiClient already retries it once via
 * silent refresh, and a still-401 after that means AuthGate/RequireAuth is
 * about to redirect to /login, where a toast would just be noise.
 */
function reportError(error: unknown) {
  if (!(error instanceof ApiError)) return;

  const pushToast = useUiStore.getState().pushToast;
  switch (error.status) {
    case 400:
    case 401:
      // 400s are form/field-level validation — components own that
      // presentation (inline errors, a targeted toast, etc). 401 is
      // silent: apiClient already retried via refresh, and a still-401
      // means a redirect to /login is about to happen.
      return;
    case 403:
      pushToast({ title: 'Access denied', description: error.message, variant: 'error' });
      return;
    case 404:
      // Pages render their own ErrorState/EmptyState for 404s — avoid
      // double-reporting the same thing as a toast too.
      return;
    case 429:
      pushToast({ title: 'Slow down', description: error.message, variant: 'warning' });
      return;
    case 0:
      pushToast({ title: 'Connection lost', description: error.message, variant: 'error' });
      return;
    default:
      pushToast({
        title: error.status >= 500 ? 'Server error' : 'Request failed',
        description: error.message,
        variant: 'error',
      });
  }
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
    queryCache: new QueryCache({ onError: reportError }),
    mutationCache: new MutationCache({ onError: reportError }),
  });
}
