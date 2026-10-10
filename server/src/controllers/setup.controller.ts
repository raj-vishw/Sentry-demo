import type { Request, Response } from 'express';
import * as setupService from '../services/setup.service.js';
import { sendSuccess } from '../utils/response.js';
import { setRefreshCookie } from '../utils/cookies.js';
import { parseDurationMs } from '../utils/duration.js';
import { env } from '../config/env.js';

const REFRESH_MAX_AGE_MS = parseDurationMs(env.JWT_REFRESH_EXPIRES_IN);

export async function getStatus(_req: Request, res: Response) {
  const status = await setupService.getSetupStatus();
  sendSuccess(res, status);
}

export async function initialize(req: Request, res: Response) {
  const result = await setupService.initializeSetup(req.body);
  setRefreshCookie(res, result.refreshToken, REFRESH_MAX_AGE_MS);
  sendSuccess(res, { user: result.user, accessToken: result.accessToken }, 201);
}
