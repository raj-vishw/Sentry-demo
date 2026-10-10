import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerUser, registerAdmin } from './helpers/auth.js';

describe('Admin: invalidate a submission', () => {
  let ctx: TestContext;
  let adminToken: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'invalidate_admin');
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('reverses points, solve count, and the solvedChallenges entry, and is audit-logged', async () => {
    const challenge = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Invalidation Target',
        description: 'Used to test submission invalidation.',
        category: 'web',
        difficulty: 'EASY',
        points: 200,
        flag: 'CTF{invalidate}',
        published: true,
        hints: [],
      });
    const challengeId = challenge.body.data.challenge.id;

    const userToken = await registerUser(ctx, 'invalidate_user');
    await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ flag: 'CTF{invalidate}' });

    const beforeProfile = await request(ctx.app).get('/api/v1/users/me').set('Authorization', `Bearer ${userToken}`);
    expect(beforeProfile.body.data.user.points).toBe(200);
    expect(beforeProfile.body.data.user.solvedCount).toBe(1);

    const submissions = await request(ctx.app)
      .get('/api/v1/admin/submissions')
      .query({ result: 'correct' })
      .set('Authorization', `Bearer ${adminToken}`);
    const submission = submissions.body.data.submissions.find(
      (s: { challengeId: string }) => s.challengeId === challengeId,
    );

    const invalidated = await request(ctx.app)
      .post(`/api/v1/admin/submissions/${submission.id}/invalidate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(invalidated.status).toBe(200);
    expect(invalidated.body.data.invalidated).toBe(true);

    const afterProfile = await request(ctx.app).get('/api/v1/users/me').set('Authorization', `Bearer ${userToken}`);
    expect(afterProfile.body.data.user.points).toBe(0);
    expect(afterProfile.body.data.user.solvedCount).toBe(0);

    const detail = await request(ctx.app)
      .get(`/api/v1/admin/challenges/${challengeId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detail.body.data.challenge.solves).toBe(0);

    const auditLog = await request(ctx.app)
      .get('/api/v1/admin/audit-logs')
      .query({ action: 'ADMIN_INVALIDATED_SUBMISSION' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(auditLog.body.data.entries.length).toBeGreaterThan(0);
  });

  it('rejects invalidating a submission that is already incorrect', async () => {
    const challenge = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Already Incorrect Target',
        description: 'Used to test the 409 path.',
        category: 'web',
        difficulty: 'EASY',
        points: 50,
        flag: 'CTF{already_incorrect}',
        published: true,
        hints: [],
      });
    const challengeId = challenge.body.data.challenge.id;
    const userToken = await registerUser(ctx, 'invalidate_wrong_user');
    await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ flag: 'wrong' });

    const submissions = await request(ctx.app)
      .get('/api/v1/admin/submissions')
      .query({ result: 'incorrect' })
      .set('Authorization', `Bearer ${adminToken}`);
    const submission = submissions.body.data.submissions.find(
      (s: { challengeId: string }) => s.challengeId === challengeId,
    );

    const res = await request(ctx.app)
      .post(`/api/v1/admin/submissions/${submission.id}/invalidate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(409);
  });

  it('rejects a non-admin invalidating a submission', async () => {
    const token = await registerUser(ctx, 'invalidate_plain_user');
    const res = await request(ctx.app)
      .post('/api/v1/admin/submissions/000000000000000000000000/invalidate')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
