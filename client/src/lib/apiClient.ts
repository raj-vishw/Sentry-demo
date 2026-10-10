export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'MAINTENANCE_MODE'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}
interface ApiFailure {
  success: false;
  error: { code: ApiErrorCode; message: string; details?: unknown };
}

const BASE_URL = '/api/v1';

// Must match the backend's ADMIN_ROUTE_PREFIX (server/.env) — see
// client/.env.example for why this is configurable (defense-in-depth
// against scanners, not a secret — it's baked into this public bundle).
export const ADMIN_PREFIX = import.meta.env.VITE_ADMIN_ROUTE_PREFIX || 'admin';

/**
 * The in-memory access token. Deliberately not in this module's exports —
 * only authStore (via setAccessTokenGetter) and this client ever see it.
 * Never written to localStorage/sessionStorage; see server/README.md
 * "Authentication Architecture" for the full rationale.
 */
let getAccessToken: () => string | null = () => null;
let onUnauthorized: () => void = () => {};
let onMaintenanceMode: () => void = () => {};

export function configureApiClient(opts: {
  getAccessToken: () => string | null;
  onUnauthorized: () => void;
  onMaintenanceMode?: () => void;
}) {
  getAccessToken = opts.getAccessToken;
  onUnauthorized = opts.onUnauthorized;
  if (opts.onMaintenanceMode) onMaintenanceMode = opts.onMaintenanceMode;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = rawRequest<{ user: unknown; accessToken: string }>('/auth/refresh', { method: 'POST' })
      .then((res) => res.accessToken)
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function rawRequest<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      credentials: 'include', // send the HttpOnly refresh cookie
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection.');
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? ((await res.json()) as ApiSuccess<T> | ApiFailure) : null;

  if (!res.ok || !body || body.success === false) {
    const error = body && body.success === false ? body.error : null;
    if (error?.code === 'MAINTENANCE_MODE') onMaintenanceMode();
    throw new ApiError(
      res.status,
      error?.code ?? 'INTERNAL_ERROR',
      error?.message ?? 'Something went wrong. Please try again.',
      error?.details,
    );
  }

  return body.data;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  isForm?: boolean;
  /** Internal — prevents infinite retry loops on the refresh call itself. */
  _isRetry?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined && !opts.isForm) headers['Content-Type'] = 'application/json';

  try {
    return await rawRequest<T>(path, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : opts.isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
    });
  } catch (err) {
    const isAuthRoute = path.startsWith('/auth/');
    if (err instanceof ApiError && err.status === 401 && !opts._isRetry && !isAuthRoute) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return request<T>(path, { ...opts, _isRetry: true });
      }
      onUnauthorized();
    }
    throw err;
  }
}

/**
 * Downloads require the Bearer token, so a plain `<a href>` (no way to set
 * headers) can't hit an authenticated endpoint directly — this fetches the
 * bytes with the same auth/refresh handling as everything else and hands
 * back a Blob for the caller to turn into an object URL.
 */
async function getBlob(path: string, isRetry = false): Promise<Blob> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { headers, credentials: 'include' });

  if (res.status === 401 && !isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) return getBlob(path, true);
    onUnauthorized();
  }
  if (!res.ok) {
    throw new ApiError(res.status, res.status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR', 'Could not download this file.');
  }
  return res.blob();
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  postForm: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form, isForm: true }),
  getBlob,
};
