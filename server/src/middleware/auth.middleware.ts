import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from '../utils/errors.js';

/**
 * Authenticates the request from the short-lived access token in the
 * Authorization header. The user id/role attached here comes only from a
 * verified JWT signature — never from anything the client claims in the
 * request body, matching the "never trust a client-supplied user id" rule.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(AppError.unauthorized());
    return;
  }

  const token = header.slice('Bearer '.length);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(AppError.unauthorized('Session expired or invalid. Please log in again.'));
  }
}

/**
 * Attaches `req.user` when a valid access token is present, but never
 * rejects the request otherwise. Used for endpoints whose response shape
 * depends on the caller's identity without requiring one (e.g. challenge
 * listings showing per-user solved status only when logged in).
 */
export function attachUserIfPresent(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyAccessToken(header.slice('Bearer '.length));
    } catch {
      // Ignore invalid/expired tokens on optional-auth routes.
    }
  }
  next();
}
