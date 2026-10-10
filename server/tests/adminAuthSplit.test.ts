import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerUser } from './helpers/auth.js';

// Admin accounts must only authenticate through the hidden admin login
// route, and vice versa — see auth.service.ts#login's `requiredRole` check.
describe('Split admin/user login surfaces', () => {
  let ctx: TestContext;
  const ADMIN_CREDS = { identifier: 'split_admin', password: 'SuperSecret123' };

  beforeAll(async () => {
    ctx = await createTestContext();
    await registerUser(ctx, 'split_admin');
    const { User } = await import('../src/models/User.js');
    await User.updateOne({ username: 'split_admin' }, { role: 'ADMIN' });
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('rejects an ADMIN account on the public /auth/login route with a generic error', async () => {
    const res = await request(ctx.app).post('/api/v1/auth/login').send(ADMIN_CREDS);
    expect(res.status).toBe(401);
    // Same message a wrong password gets — never confirms the account is an admin.
    expect(res.body.error.message).toBe('Invalid credentials.');
  });

  it('accepts the same ADMIN account on the admin login route', async () => {
    const res = await request(ctx.app).post('/api/v1/admin/login').send(ADMIN_CREDS);
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('ADMIN');
    expect(res.body.data.accessToken).toBeTypeOf('string');
  });

  it('rejects a USER account on the admin login route with the same generic error', async () => {
    const token = await registerUser(ctx, 'split_plain_user');
    expect(token).toBeTypeOf('string');
    const res = await request(ctx.app)
      .post('/api/v1/admin/login')
      .send({ identifier: 'split_plain_user', password: 'SuperSecret123' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid credentials.');
  });

  it('still accepts a USER account on the public /auth/login route', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'split_plain_user', password: 'SuperSecret123' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('USER');
  });

  it('sets the same refresh cookie (same path) from either login route', async () => {
    const res = await request(ctx.app).post('/api/v1/admin/login').send(ADMIN_CREDS);
    const setCookie = res.headers['set-cookie']?.[0] ?? '';
    expect(setCookie).toContain('refreshToken=');
    expect(setCookie).toContain('Path=/api/v1/auth');
  });
});
