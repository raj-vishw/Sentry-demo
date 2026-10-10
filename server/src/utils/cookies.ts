import type { Response } from 'express';
import { isProduction } from '../config/env.js';

export const REFRESH_COOKIE_NAME = 'refreshToken';
// Scoped to /api/v1/auth so the browser only attaches it to the endpoints
// that actually need it (refresh, logout) rather than every request.
const COOKIE_PATH = '/api/v1/auth';

/**
 * The refresh token lives only in an HttpOnly cookie — never in a JSON
 * response body, localStorage, or Zustand state — so it is inaccessible to
 * frontend JavaScript (and therefore to XSS). The short-lived access token
 * is the only credential the frontend ever holds directly, and only in
 * memory. See server/README.md "Authentication architecture".
 */
export function setRefreshCookie(res: Response, token: string, maxAgeMs: number) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: COOKIE_PATH,
    maxAge: maxAgeMs,
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: COOKIE_PATH,
  });
}
