import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerAdmin } from './helpers/auth.js';

// Every other test file relies on the Zod-default prefix ('admin') by never
// setting ADMIN_ROUTE_PREFIX themselves — this is the one file that
// exercises actual configurability, verifying the admin API genuinely
// moves (and the old path genuinely stops responding) when it's set.
//
// `process.env` is a real shared global across test files (unlike each
// file's own module registry, which Vitest does isolate) — setting this at
// module scope would leak into whichever test file vitest happens to run
// next, breaking every other suite's hardcoded `/api/v1/admin/...` calls.
// So it's set right before (and unset right after) this file's own use.
describe('Configurable admin route prefix', () => {
  let ctx: TestContext;
  let adminToken: string;

  beforeAll(async () => {
    process.env.ADMIN_ROUTE_PREFIX = 'ops-test-7f3a2';
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'prefix_admin');
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
    delete process.env.ADMIN_ROUTE_PREFIX;
  });

  it('serves the admin API under the configured prefix', async () => {
    const res = await request(ctx.app)
      .get('/api/v1/ops-test-7f3a2/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('no longer serves the admin API under the default /admin path', async () => {
    const res = await request(ctx.app).get('/api/v1/admin/users').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('still requires ADMIN role under the configured prefix — the path change is not the real access control', async () => {
    const res = await request(ctx.app).get('/api/v1/ops-test-7f3a2/users');
    expect(res.status).toBe(401);
  });
});
