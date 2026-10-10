import type { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.js';
import { setRefreshCookie, clearRefreshCookie, REFRESH_COOKIE_NAME } from '../utils/cookies.js';
import { parseDurationMs } from '../utils/duration.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

const REFRESH_MAX_AGE_MS = parseDurationMs(env.JWT_REFRESH_EXPIRES_IN);

export async function register(req: Request, res: Response) {
  const result = await authService.register(req.body);
  if (result.pending) {
    // No tokens issued, no cookie set — see auth.service.ts#register.
    sendSuccess(res, { user: result.user, pending: true }, 201);
    return;
  }
  setRefreshCookie(res, result.refreshToken!, REFRESH_MAX_AGE_MS);
  sendSuccess(res, { user: result.user, pending: false, accessToken: result.accessToken }, 201);
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body, { requiredRole: 'USER' });
  setRefreshCookie(res, result.refreshToken, REFRESH_MAX_AGE_MS);
  sendSuccess(res, { user: result.user, accessToken: result.accessToken });
}

// Mounted only under the hidden admin route prefix — see adminAuth.routes.ts.
export async function adminLogin(req: Request, res: Response) {
  const result = await authService.login(req.body, { requiredRole: 'ADMIN' });
  setRefreshCookie(res, result.refreshToken, REFRESH_MAX_AGE_MS);
  sendSuccess(res, { user: result.user, accessToken: result.accessToken });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) throw AppError.unauthorized('No active session.');

  const result = await authService.refresh(token);
  setRefreshCookie(res, result.refreshToken, REFRESH_MAX_AGE_MS);
  sendSuccess(res, { user: result.user, accessToken: result.accessToken });
}

export async function logout(req: Request, res: Response) {
  if (req.user) {
    await authService.logout(req.user.sub);
  }
  clearRefreshCookie(res);
  sendSuccess(res, { loggedOut: true });
}

export async function me(req: Request, res: Response) {
  const user = await authService.getCurrentUser(req.user!.sub);
  sendSuccess(res, { user });
}
