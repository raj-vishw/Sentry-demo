import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';

describe('Authorization (RBAC)', () => {
  let ctx: TestContext;
  let userToken: string;
  let adminToken: string;

  beforeAll(async () => {
    ctx = await createTestContext();

    const userRes = await request(ctx.app).post('/api/v1/auth/register').send({
      username: 'plain_user',
      email: 'plain_user@example.com',
      password: 'SuperSecret123',
      confirmPassword: 'SuperSecret123',
    });
    userToken = userRes.body.data.accessToken;

    // Public registration can never produce an ADMIN — seed one directly
    // through the model, the same way the seed script does.
    const { User } = await import('../src/models/User.js');
    const { hashPassword } = await import('../src/utils/password.js');
    await User.create({
      username: 'root_admin',
      email: 'root_admin@example.com',
      passwordHash: await hashPassword('SuperSecret123'),
      role: 'ADMIN',
    });
    const adminRes = await request(ctx.app)
      .post(`/api/v1/${process.env.ADMIN_ROUTE_PREFIX ?? 'admin'}/login`)
      .send({ identifier: 'root_admin', password: 'SuperSecret123' });
    adminToken = adminRes.body.data.accessToken;
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('confirms the seeded account really is an ADMIN and the registered account really is a USER', async () => {
    const admin = await request(ctx.app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const user = await request(ctx.app).get('/api/v1/auth/me').set('Authorization', `Bearer ${userToken}`);
    expect(admin.body.data.user.role).toBe('ADMIN');
    expect(user.body.data.user.role).toBe('USER');
  });

  it('denies a USER access to an admin-only endpoint', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('denies an unauthenticated caller access to an admin-only endpoint', async () => {
    const res = await request(ctx.app).post('/api/v1/admin/challenges').send({});
    expect(res.status).toBe(401);
  });

  it('allows an ADMIN to reach an admin-only endpoint (validation runs, meaning RBAC passed)', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({}); // intentionally invalid body — proves we got past RBAC into validation
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('never trusts a client-supplied user id — /users/me always reflects the token owner', async () => {
    const res = await request(ctx.app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ userId: 'someone-elses-id' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe('plain_user');
  });
});
