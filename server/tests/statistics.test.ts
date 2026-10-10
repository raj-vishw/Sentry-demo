import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerUser, registerAdmin } from './helpers/auth.js';

describe('Admin statistics', () => {
  let ctx: TestContext;
  let adminToken: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'stats_admin');

    const challenge = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Stats Target',
        description: 'Used to test statistics aggregation.',
        category: 'crypto',
        difficulty: 'MEDIUM',
        points: 200,
        flag: 'CTF{stats}',
        published: true,
        hints: [],
      });
    const challengeId = challenge.body.data.challenge.id;

    const solverToken = await registerUser(ctx, 'stats_solver');
    await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${solverToken}`)
      .send({ flag: 'wrong' });
    await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${solverToken}`)
      .send({ flag: 'CTF{stats}' });
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('rejects a non-admin from reading any statistics endpoint', async () => {
    const token = await registerUser(ctx, 'plain_stats_viewer');
    const res = await request(ctx.app).get('/api/v1/admin/statistics/overview').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('returns platform overview totals', async () => {
    const res = await request(ctx.app).get('/api/v1/admin/statistics/overview').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.totalChallenges).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totalSubmissions).toBeGreaterThanOrEqual(2);
    expect(res.body.data.successfulSubmissions).toBeGreaterThanOrEqual(1);
  });

  it('computes submission success rate and top-attempted challenges', async () => {
    const res = await request(ctx.app)
      .get('/api/v1/admin/statistics/submissions')
      .query({ range: 'all' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThanOrEqual(2);
    expect(res.body.data.topAttempted[0].title).toBe('Stats Target');
    expect(res.body.data.topAttempted[0].attempts).toBeGreaterThanOrEqual(2);
  });

  it('rejects an invalid range value', async () => {
    const res = await request(ctx.app)
      .get('/api/v1/admin/statistics/users')
      .query({ range: 'eventually' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('breaks challenge stats down by category and difficulty', async () => {
    const res = await request(ctx.app)
      .get('/api/v1/admin/statistics/challenges')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.categoryDistribution.some((c: { category: string }) => c.category === 'crypto')).toBe(true);
    expect(res.body.data.difficultyDistribution.some((d: { difficulty: string }) => d.difficulty === 'MEDIUM')).toBe(true);
  });
});
