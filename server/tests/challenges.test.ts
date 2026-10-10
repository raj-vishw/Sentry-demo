import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';

describe('Challenge management', () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    ctx = await createTestContext();

    const { User } = await import('../src/models/User.js');
    const { hashPassword } = await import('../src/utils/password.js');
    await User.create({
      username: 'chal_admin',
      email: 'chal_admin@example.com',
      passwordHash: await hashPassword('SuperSecret123'),
      role: 'ADMIN',
    });
    const adminLogin = await request(ctx.app)
      .post(`/api/v1/${process.env.ADMIN_ROUTE_PREFIX ?? 'admin'}/login`)
      .send({ identifier: 'chal_admin', password: 'SuperSecret123' });
    adminToken = adminLogin.body.data.accessToken;

    const userRegister = await request(ctx.app).post('/api/v1/auth/register').send({
      username: 'chal_user',
      email: 'chal_user@example.com',
      password: 'SuperSecret123',
      confirmPassword: 'SuperSecret123',
    });
    userToken = userRegister.body.data.accessToken;
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  const payload = {
    title: 'Shadow Login',
    description: 'A broken authentication challenge worth testing.',
    category: 'web',
    difficulty: 'MEDIUM',
    points: 300,
    flag: 'CTF{test_flag_value}',
    flagFormat: 'CTF{...}',
    published: false,
    hints: [{ title: 'Hint one', content: 'Look at the JWT.', cost: 25, order: 0 }],
  };

  let challengeId: string;
  let challengeSlug: string;

  it('lets an admin create a draft (unpublished) challenge without leaking the flag', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data.challenge.published).toBe(false);
    expect(res.body.data.challenge.flag).toBeUndefined();
    expect(res.body.data.challenge.flagHash).toBeUndefined();
    expect(res.body.data.challenge.hints).toHaveLength(1);
    challengeId = res.body.data.challenge.id;
    challengeSlug = res.body.data.challenge.slug;
  });

  it('hides an unpublished challenge from the public list', async () => {
    const res = await request(ctx.app).get('/api/v1/challenges');
    expect(res.status).toBe(200);
    expect(res.body.data.challenges.find((c: { id: string }) => c.id === challengeId)).toBeUndefined();
  });

  it('shows unpublished challenges to an admin in the list', async () => {
    const res = await request(ctx.app).get('/api/v1/challenges').set('Authorization', `Bearer ${adminToken}`);
    expect(res.body.data.challenges.find((c: { id: string }) => c.id === challengeId)).toBeDefined();
  });

  it('404s when a non-admin requests the unpublished challenge by slug', async () => {
    const res = await request(ctx.app).get(`/api/v1/challenges/${challengeSlug}`);
    expect(res.status).toBe(404);
  });

  it('denies a plain USER from creating, updating, deleting, or publishing challenges', async () => {
    const headers = { Authorization: `Bearer ${userToken}` };
    const create = await request(ctx.app).post('/api/v1/admin/challenges').set(headers).send(payload);
    const update = await request(ctx.app).patch(`/api/v1/admin/challenges/${challengeId}`).set(headers).send({ points: 999 });
    const del = await request(ctx.app).delete(`/api/v1/admin/challenges/${challengeId}`).set(headers);
    const publish = await request(ctx.app).post(`/api/v1/admin/challenges/${challengeId}/publish`).set(headers);

    for (const res of [create, update, del, publish]) {
      expect(res.status).toBe(403);
    }
  });

  it('lets an admin publish the challenge, after which it appears publicly', async () => {
    const publishRes = await request(ctx.app)
      .post(`/api/v1/admin/challenges/${challengeId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.data.challenge.published).toBe(true);

    const detail = await request(ctx.app).get(`/api/v1/challenges/${challengeSlug}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.challenge.title).toBe(payload.title);
    expect(detail.body.data.challenge.flag).toBeUndefined();
    expect(detail.body.data.challenge.flagHash).toBeUndefined();
  });

  it('only reveals free-hint content; paid hint content stays hidden until unlocked', async () => {
    const detail = await request(ctx.app).get(`/api/v1/challenges/${challengeSlug}`);
    const hint = detail.body.data.challenge.hints[0];
    expect(hint.cost).toBe(25);
    expect(hint.unlocked).toBe(false);
    expect(hint.content).toBeNull();
  });

  it('lets an admin update challenge fields, including replacing the flag', async () => {
    const res = await request(ctx.app)
      .patch(`/api/v1/admin/challenges/${challengeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ points: 350, flag: 'CTF{new_flag_value}' });
    expect(res.status).toBe(200);
    expect(res.body.data.challenge.points).toBe(350);
    expect(res.body.data.challenge.flag).toBeUndefined();
  });

  it('lets an admin delete a challenge, after which it 404s', async () => {
    const res = await request(ctx.app)
      .delete(`/api/v1/admin/challenges/${challengeId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    const detail = await request(ctx.app)
      .get(`/api/v1/challenges/${challengeSlug}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detail.status).toBe(404);
  });

  it('rejects invalid challenge input with a validation error', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'x', category: 'not-a-real-category' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
