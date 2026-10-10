import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerAdmin } from './helpers/auth.js';

// A database can already have an admin without the wizard ever having run —
// an older deployment upgrading into this feature, or a local dev database
// seeded before SystemConfig existed at all. Setup must not re-appear in
// that case. In its own file (not a second describe block in
// setupWizard.test.ts) because createTestContext() boots its own in-memory
// MongoDB per file via a dynamic import of config/env.js, which caches —
// a second call within the same file's module registry would try to
// reconnect to the first (already-stopped) instance.
describe('First-run setup wizard — pre-existing admin', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
    await registerAdmin(ctx, 'preexisting_admin');
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('reports setup as already completed when an admin exists but the wizard was never run', async () => {
    const res = await request(ctx.app).get('/api/v1/setup/status');
    expect(res.body.data.completed).toBe(true);
  });

  it('rejects initialization even though the setupCompleted flag was never explicitly set', async () => {
    const res = await request(ctx.app).post('/api/v1/setup/initialize').send({
      username: 'anotheradmin',
      email: 'another@example.com',
      password: 'SuperSecret123',
      confirmPassword: 'SuperSecret123',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('Setup has already been completed.');
  });
});
