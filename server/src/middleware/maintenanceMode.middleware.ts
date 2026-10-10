import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { getConfig } from '../services/systemConfig.service.js';
import { AppError } from '../utils/errors.js';
import { env } from '../config/env.js';

// Always reachable even while maintenance mode is on: health checks (so an
// orchestrator doesn't see the whole platform as down), the setup wizard
// (there may be no admin yet to turn maintenance mode back off with), and
// the admin login route (an admin must always be able to get in to turn it
// back off).
const ALWAYS_ALLOWED_PREFIXES = ['/api/health', '/api/v1/setup', `/api/v1/${env.ADMIN_ROUTE_PREFIX}/login`];

/**
 * Self-contained rather than depending on `attachUserIfPresent` running
 * first in the middleware chain — verifies the token itself (cheap,
 * synchronous JWT check, same as that middleware) so this works regardless
 * of mount order. One extra DB read per request (a single indexed document)
 * to check the flag — consistent with this codebase's "compute live, don't
 * cache" philosophy elsewhere (team points, leaderboard, rank).
 */
export async function maintenanceMode(req: Request, _res: Response, next: NextFunction) {
  if (ALWAYS_ALLOWED_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    next();
    return;
  }

  const config = await getConfig();
  if (!config.maintenanceMode) {
    next();
    return;
  }

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = verifyAccessToken(header.slice('Bearer '.length));
      if (payload.role === 'ADMIN') {
        next();
        return;
      }
    } catch {
      // Invalid/expired token — falls through to the maintenance response
      // below, same as any other unauthenticated caller.
    }
  }

  next(AppError.maintenance());
}
