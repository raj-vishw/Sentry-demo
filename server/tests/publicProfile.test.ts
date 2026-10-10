import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerUser, registerAdmin } from './helpers/auth.js';

describe('Public profile', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('returns a public profile with no auth required, excluding the email', async () => {
    await registerUser(ctx, 'public_profile_user');
    const res = await request(ctx.app).get('/api/v1/users/public_profile_user');
    expect(res.status).toBe(200);
    expect(res.body.data.profile.username).toBe('public_profile_user');
    expect(res.body.data.profile.email).toBeUndefined();
    expect(res.body.data.profile.points).toBe(0);
    expect(Array.isArray(res.body.data.profile.badges)).toBe(true);
    expect(Array.isArray(res.body.data.profile.writeups)).toBe(true);
  });

  it('404s for an unknown username', async () => {
    const res = await request(ctx.app).get('/api/v1/users/nobody_with_this_username');
    expect(res.status).toBe(404);
  });

  it('still lets an authenticated user reach their own /me profile (no :username shadowing)', async () => {
    const token = await registerUser(ctx, 'me_route_check');
    const res = await request(ctx.app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe('me_route_check');
    expect(res.body.data.user.email).toBeDefined();
  });

  it('includes published writeups by that user', async () => {
    const adminToken = await registerAdmin(ctx, 'public_profile_admin');
    const challenge = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Public Profile Writeup Target',
        description: 'Used to test the public profile writeups list.',
        category: 'web',
        difficulty: 'EASY',
        points: 50,
        flag: 'CTF{public_profile}',
        published: true,
        hints: [],
      });
    const challengeId = challenge.body.data.challenge.id;

    const authorToken = await registerUser(ctx, 'public_profile_writer');
    await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ flag: 'CTF{public_profile}' });
    const writeup = await request(ctx.app)
      .post('/api/v1/writeups')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ title: 'Public Profile Writeup', challengeId, content: 'Real writeup content here. '.repeat(5) });
    const writeupId = writeup.body.data.writeup.id;
    await request(ctx.app).post(`/api/v1/writeups/${writeupId}/submit`).set('Authorization', `Bearer ${authorToken}`);
    await request(ctx.app)
      .post(`/api/v1/admin/writeups/${writeupId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    const res = await request(ctx.app).get('/api/v1/users/public_profile_writer');
    expect(res.body.data.profile.writeups).toHaveLength(1);
    expect(res.body.data.profile.writeups[0].title).toBe('Public Profile Writeup');
  });
});
