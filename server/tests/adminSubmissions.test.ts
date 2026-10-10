import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerUser, registerAdmin } from './helpers/auth.js';

describe('Admin submission monitoring', () => {
  let ctx: TestContext;
  let adminToken: string;
  let challengeId: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'submission_admin');

    const challenge = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Submission Monitor Target',
        description: 'Used to test admin submission monitoring.',
        category: 'crypto',
        difficulty: 'EASY',
        points: 75,
        flag: 'CTF{monitor}',
        published: true,
        hints: [],
      });
    challengeId = challenge.body.data.challenge.id;

    const solverToken = await registerUser(ctx, 'submission_solver');
    await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${solverToken}`)
      .send({ flag: 'wrong' });
    await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${solverToken}`)
      .send({ flag: 'CTF{monitor}' });
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('rejects a non-admin', async () => {
    const token = await registerUser(ctx, 'plain_submission_viewer');
    const res = await request(ctx.app).get('/api/v1/admin/submissions').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('lists submissions with hydrated user/challenge fields (not populated-object noise) and correct pagination', async () => {
    const res = await request(ctx.app).get('/api/v1/admin/submissions').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.submissions.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.pagination).toEqual({ page: 1, limit: 25, total: 2, totalPages: 1 });

    const correct = res.body.data.submissions.find((s: { correct: boolean }) => s.correct);
    expect(correct.username).toBe('submission_solver');
    // A real 24-char hex id, not a stringified populated subdocument.
    expect(correct.challengeId).toMatch(/^[0-9a-f]{24}$/);
    expect(correct.challengeTitle).toBe('Submission Monitor Target');
    expect(correct.category).toBe('crypto');
    expect(typeof correct.flaggedForReview).toBe('boolean');
  });

  it('filters by result and username', async () => {
    const correctOnly = await request(ctx.app)
      .get('/api/v1/admin/submissions')
      .query({ result: 'correct' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(correctOnly.body.data.submissions.every((s: { correct: boolean }) => s.correct)).toBe(true);

    const byUser = await request(ctx.app)
      .get('/api/v1/admin/submissions')
      .query({ username: 'submission_solver' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(byUser.body.data.submissions.length).toBe(2);

    const noMatch = await request(ctx.app)
      .get('/api/v1/admin/submissions')
      .query({ username: 'nobody_with_this_name' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(noMatch.body.data.submissions).toHaveLength(0);
  });
});
