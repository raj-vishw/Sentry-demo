import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().min(1).default('http://localhost:5173'),
  // Defense-in-depth, not the real access control (requireRole('ADMIN')
  // still gates every route underneath, see routes/admin.routes.ts) —
  // moves the admin API off the predictable /api/v1/admin path so it
  // doesn't show up in automated scans/bots that probe common admin paths.
  // Defaults to 'admin' so dev/test setups work unchanged; every real
  // deployment should override this to a non-guessable value.
  ADMIN_ROUTE_PREFIX: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/, 'ADMIN_ROUTE_PREFIX may only contain lowercase letters, numbers, and hyphens.')
    .default('admin'),
  // Where the repo's docs/ folder lives on disk (see services/docs.service.ts).
  // Empty string is a sentinel for "use the default" (resolved relative to
  // process.cwd() at the point of use) rather than baking a path into the
  // schema — bare-metal dev (cwd = server/, docs/ one level up) and Docker
  // (cwd = /app, docs/ copied/bind-mounted alongside it) need different
  // defaults, so both compose files set this explicitly instead of relying
  // on one default working for every environment.
  DOCS_DIR: z.string().default(''),
});

/**
 * Fails fast and loudly if required configuration is missing, instead of
 * letting the app boot with `undefined` secrets.
 */
function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment configuration:');
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
