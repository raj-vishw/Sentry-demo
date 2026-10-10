import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { isTest } from '../config/env.js';

function rateLimitedHandler(_req: Request, _res: Response, next: NextFunction) {
  next(AppError.rateLimited());
}

// Rate limiting is disabled under test so the suite isn't flaky/slow, but
// the middleware itself is still exercised by a dedicated limiter test
// that constructs its own short-window instance.
const skip = () => isTest;

// Admins are exempt from the per-user limiters below (submission brute-force
// protection, invite-code guessing protection) so they can test challenges
// and teams without tripping limits meant for ordinary play. `req.user.role`
// comes straight from the verified JWT (see auth.middleware.ts) — no DB
// lookup — so this stays cheap. Not applied to `apiLimiter`/`authLimiter`:
// those run before `requireAuth`, so there's no verified `req.user` yet to
// trust, and exempting pre-auth requests would defeat their actual purpose
// (credential-stuffing / global abuse protection, not role-based).
const skipOrAdmin = (req: Request) => isTest || req.user?.role === 'ADMIN';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitedHandler,
  skip,
});

// Stricter limit on auth endpoints — abuse-sensitive (credential stuffing,
// account enumeration via registration).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitedHandler,
  skip,
});

// Flag submission is the most abuse-sensitive endpoint in the app (brute
// forcing a flag). Keyed per authenticated user rather than per IP so a
// single account can't spread attempts across addresses, falling back to
// IP for the rare case this runs before/without auth.
export const submissionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitedHandler,
  skip: skipOrAdmin,
  keyGenerator: (req: Request) => req.user?.sub ?? ipKeyGenerator(req.ip ?? ''),
});

// Team invite codes are a ~1M-combination keyspace (see utils/inviteCode.ts)
// — not brute-forceable through the global limiter alone. Keyed per
// authenticated user for the same reason as submissionLimiter.
export const joinTeamLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitedHandler,
  skip: skipOrAdmin,
  keyGenerator: (req: Request) => req.user?.sub ?? ipKeyGenerator(req.ip ?? ''),
});
