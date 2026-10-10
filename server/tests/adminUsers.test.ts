import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerUser, registerAdmin } from './helpers/auth.js';

describe('Admin user management', () => {
  let ctx: TestContext;
  let adminToken: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'user_admin');
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('rejects a non-admin from listing or managing users', async () => {
    const token = await registerUser(ctx, 'plain_user_mgmt');
    const list = await request(ctx.app).get('/api/v1/admin/users').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(403);
  });

  it('lists and searches users, and exposes no password hash', async () => {
    await registerUser(ctx, 'searchable_target');
    const res = await request(ctx.app)
      .get('/api/v1/admin/users')
      .query({ search: 'searchable_target' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.users).toHaveLength(1);
    expect(res.body.data.users[0].username).toBe('searchable_target');
    expect(res.body.data.users[0].passwordHash).toBeUndefined();
  });

  it('disables a user, blocking further login, then re-enables it', async () => {
    const registered = await request(ctx.app)
      .post('/api/v1/auth/register')
      .send({
        username: 'disable_target',
        email: 'disable_target@example.com',
        password: 'SuperSecret123',
        confirmPassword: 'SuperSecret123',
      });
    // The refresh token only ever lives in an HttpOnly cookie, never in the
    // response body — capture it here so the refresh assertion below
    // exercises the real cookie-based path, not just a missing-cookie 401.
    const refreshCookie = registered.headers['set-cookie']?.[0] ?? '';

    const detail = await request(ctx.app)
      .get('/api/v1/admin/users')
      .query({ search: 'disable_target' })
      .set('Authorization', `Bearer ${adminToken}`);
    const userId = detail.body.data.users[0].id;

    const disabled = await request(ctx.app)
      .post(`/api/v1/admin/users/${userId}/disable`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(disabled.status).toBe(200);
    expect(disabled.body.data.user.status).toBe('DISABLED');

    const loginAttempt = await request(ctx.app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'disable_target', password: 'SuperSecret123' });
    expect(loginAttempt.status).toBe(403);

    // The already-issued access token still works until it expires — a
    // documented trade-off — but a refresh attempt (using the real
    // HttpOnly cookie from registration) must now be rejected.
    const refreshAttempt = await request(ctx.app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie);
    expect(refreshAttempt.status).toBe(401);

    const enabled = await request(ctx.app)
      .post(`/api/v1/admin/users/${userId}/enable`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(enabled.body.data.user.status).toBe('ACTIVE');

    const loginAgain = await request(ctx.app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'disable_target', password: 'SuperSecret123' });
    expect(loginAgain.status).toBe(200);
  });

  it('refuses to let an admin disable their own account', async () => {
    const detail = await request(ctx.app)
      .get('/api/v1/admin/users')
      .query({ search: 'user_admin' })
      .set('Authorization', `Bearer ${adminToken}`);
    const selfId = detail.body.data.users[0].id;

    const res = await request(ctx.app)
      .post(`/api/v1/admin/users/${selfId}/disable`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('returns a detailed user view including submission stats', async () => {
    const token = await registerUser(ctx, 'detail_target');
    const challenge = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Admin Detail Target',
        description: 'Used to test the admin user detail endpoint.',
        category: 'web',
        difficulty: 'EASY',
        points: 50,
        flag: 'CTF{detail}',
        published: true,
        hints: [],
      });
    await request(ctx.app)
      .post(`/api/v1/challenges/${challenge.body.data.challenge.id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ flag: 'CTF{detail}' });

    const list = await request(ctx.app)
      .get('/api/v1/admin/users')
      .query({ search: 'detail_target' })
      .set('Authorization', `Bearer ${adminToken}`);
    const userId = list.body.data.users[0].id;

    const res = await request(ctx.app).get(`/api/v1/admin/users/${userId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.submissionCount).toBe(1);
    expect(res.body.data.user.correctSubmissionCount).toBe(1);
    expect(res.body.data.user.recentSolves).toHaveLength(1);
  });
});
