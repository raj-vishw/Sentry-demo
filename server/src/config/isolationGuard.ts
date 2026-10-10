import { env } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * Substrings that, if found anywhere in a lowercased MONGODB_URI, mean
 * "this looks like the main Sentry repo's own production database" —
 * catches an accidentally copy-pasted production connection string
 * before anything touches it. Deliberately NOT a blanket ban on managed/
 * Atlas connection strings in general (`mongodb+srv://`, `.mongodb.net`)
 * — a dedicated, demo-only Atlas cluster is a completely legitimate way
 * to run this deployment, and banning the whole protocol would block it.
 * This lists the SPECIFIC known main-repo cluster identifier instead.
 * Not exhaustive (no denylist can be), just a cheap, loud trip-wire.
 */
const PRODUCTION_URI_DENYLIST = ['cluster0.qvnxsi2.mongodb.net', 'ctf-platform'];

/**
 * Not a secret — its one valid value is published in .env.example's
 * comment. A deliberate "did you actually read the warning" gate: forces
 * whoever configures a new environment to type this exact string once,
 * rather than silently inheriting a stray MONGODB_URI from somewhere else.
 */
const REQUIRED_CONFIRMATION = 'yes-this-is-the-demo-database';

export interface IsolationCheckResult {
  safe: boolean;
  reason?: string;
}

/**
 * Pure — no logging, no process.exit — so it's directly unit-testable.
 * Both real call sites (server.ts boot, seedDemo.ts) wrap this with the
 * actual logger.error + process.exit(1).
 */
export function checkSafeToModifyDatabase(): IsolationCheckResult {
  const uri = env.MONGODB_URI.toLowerCase();
  const hit = PRODUCTION_URI_DENYLIST.find((s) => uri.includes(s));
  if (hit) {
    return {
      safe: false,
      reason: `MONGODB_URI matches denylisted pattern "${hit}" — this looks like it could be a production database.`,
    };
  }
  if (process.env.DEMO_DB_CONFIRMATION !== REQUIRED_CONFIRMATION) {
    return {
      safe: false,
      reason:
        `DEMO_DB_CONFIRMATION is not set correctly. Set DEMO_DB_CONFIRMATION=${REQUIRED_CONFIRMATION} ` +
        'in .env to confirm this is the intended demo database before seeding, resetting, or booting against it.',
    };
  }
  return { safe: true };
}

/**
 * Fails fast and loudly (same convention as config/env.ts's own Zod
 * validation) if this process is about to connect to something that
 * doesn't look like a dedicated demo database. Call this before any
 * code path that connects to or mutates MongoDB — currently: server.ts
 * (every boot) and seedDemo.ts (before seeding/resetting).
 */
export function assertSafeToModifyDatabase(context: 'boot' | 'seed'): void {
  const result = checkSafeToModifyDatabase();
  if (!result.safe) {
    logger.error(`Refusing to run (${context}): ${result.reason}`);
    process.exit(1);
  }
}
