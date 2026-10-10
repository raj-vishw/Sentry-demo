import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { rateLimit } from 'express-rate-limit';

// env.ts (pulled in transitively by error.middleware -> logger) validates
// process.env at import time, so these must be set before that first import
// — this file boots no database/app via createTestContext, so nothing else
// sets them for us.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-access-secret-not-for-production-use-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-not-for-production-use-only';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/unused-in-this-test';

const { errorHandler } = await import('../src/middleware/error.middleware.js');
const { AppError } = await import('../src/utils/errors.js');

/**
 * The app's real submission/auth limiters are skipped under NODE_ENV=test
 * (see rateLimit.middleware.ts) so the rest of the suite isn't slow/flaky.
 * This test exercises the same express-rate-limit mechanism directly, with
 * skipping disabled, to prove the limiter itself actually returns 429 with
 * our standard error shape once the limit is exceeded.
 */
describe('rate limiting mechanism', () => {
  it('returns 429 with a RATE_LIMITED error after the limit is exceeded', async () => {
    const app = express();
    const limiter = rateLimit({
      windowMs: 60_000,
      limit: 3,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, _res, next) => next(AppError.rateLimited()),
    });
    app.get('/limited', limiter, (_req, res) => res.json({ success: true, data: { ok: true } }));
    app.use(errorHandler);

    const agent = request.agent(app);
    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(await agent.get('/limited'));
    }

    const statuses = results.map((r) => r.status);
    expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
    expect(statuses.slice(3)).toEqual([429, 429]);

    const limited = results[3];
    expect(limited.body.success).toBe(false);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
  });
});
