import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';

describe('Challenge list query (search/filter/sort/pagination)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;

  async function createChallenge(overrides: Partial<Record<string, unknown>>) {
    const res = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Base Challenge',
        description: 'A query-test fixture challenge.',
        category: 'web',
        difficulty: 'EASY',
        points: 100,
        flag: 'CTF{fixture}',
        published: true,
        hints: [],
        ...overrides,
      });
    return res.body.data.challenge as { id: string; slug: string };
  }

  beforeAll(async () => {
    ctx = await createTestContext();

    const { User } = await import('../src/models/User.js');
    const { hashPassword } = await import('../src/utils/password.js');
    await User.create({
      username: 'query_admin',
      email: 'query_admin@example.com',
      passwordHash: await hashPassword('SuperSecret123'),
      role: 'ADMIN',
    });
    adminToken = (
      await request(ctx.app)
        .post(`/api/v1/${process.env.ADMIN_ROUTE_PREFIX ?? 'admin'}/login`)
        .send({ identifier: 'query_admin', password: 'SuperSecret123' })
    ).body.data.accessToken;

    userToken = (
      await request(ctx.app).post('/api/v1/auth/register').send({
        username: 'query_user',
        email: 'query_user@example.com',
        password: 'SuperSecret123',
        confirmPassword: 'SuperSecret123',
      })
    ).body.data.accessToken;

    await createChallenge({ title: 'Shadow Login', category: 'web', difficulty: 'MEDIUM', points: 300, flag: 'CTF{a}' });
    await createChallenge({ title: 'Broken Cipher', category: 'crypto', difficulty: 'HARD', points: 500, flag: 'CTF{b}' });
    await createChallenge({ title: 'Pixel Forensics', category: 'forensics', difficulty: 'EASY', points: 100, flag: 'CTF{c}' });
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('searches by title (case-insensitive substring)', async () => {
    const res = await request(ctx.app).get('/api/v1/challenges?search=shadow');
    expect(res.status).toBe(200);
    expect(res.body.data.challenges).toHaveLength(1);
    expect(res.body.data.challenges[0].title).toBe('Shadow Login');
  });

  it('filters by category', async () => {
    const res = await request(ctx.app).get('/api/v1/challenges?category=crypto');
    expect(res.body.data.challenges.every((c: { category: string }) => c.category === 'crypto')).toBe(true);
    expect(res.body.data.challenges.length).toBeGreaterThanOrEqual(1);
  });

  it('filters by difficulty', async () => {
    const res = await request(ctx.app).get('/api/v1/challenges?difficulty=EASY');
    expect(res.status).toBe(200);
    expect(res.body.data.challenges.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.challenges.every((c: { difficulty: string }) => c.difficulty === 'EASY')).toBe(true);
  });

  it('filters by a points range', async () => {
    const res = await request(ctx.app).get('/api/v1/challenges?minPoints=200&maxPoints=400');
    expect(res.body.data.challenges.every((c: { points: number }) => c.points >= 200 && c.points <= 400)).toBe(true);
    expect(res.body.data.challenges.some((c: { title: string }) => c.title === 'Shadow Login')).toBe(true);
  });

  it('rejects minPoints greater than maxPoints', async () => {
    const res = await request(ctx.app).get('/api/v1/challenges?minPoints=500&maxPoints=100');
    expect(res.status).toBe(400);
  });

  it('sorts by points descending and ascending', async () => {
    const desc = await request(ctx.app).get('/api/v1/challenges?sort=points-desc&limit=100');
    const points = desc.body.data.challenges.map((c: { points: number }) => c.points);
    expect([...points].sort((a, b) => b - a)).toEqual(points);

    const asc = await request(ctx.app).get('/api/v1/challenges?sort=points-asc&limit=100');
    const pointsAsc = asc.body.data.challenges.map((c: { points: number }) => c.points);
    expect([...pointsAsc].sort((a, b) => a - b)).toEqual(pointsAsc);
  });

  it('filters by solved/unsolved for the authenticated user', async () => {
    const unsolvedBefore = await request(ctx.app)
      .get('/api/v1/challenges?solved=unsolved&limit=100')
      .set('Authorization', `Bearer ${userToken}`);
    const totalUnsolvedBefore = unsolvedBefore.body.data.pagination.total;

    const target = await createChallenge({ title: 'Solve Me', flag: 'CTF{solveme}' });
    await request(ctx.app)
      .post(`/api/v1/challenges/${target.id}/submit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ flag: 'CTF{solveme}' });

    const solved = await request(ctx.app)
      .get('/api/v1/challenges?solved=solved')
      .set('Authorization', `Bearer ${userToken}`);
    expect(solved.body.data.challenges.some((c: { title: string }) => c.title === 'Solve Me')).toBe(true);

    const unsolvedAfter = await request(ctx.app)
      .get('/api/v1/challenges?solved=unsolved&limit=100')
      .set('Authorization', `Bearer ${userToken}`);
    expect(unsolvedAfter.body.data.challenges.some((c: { title: string }) => c.title === 'Solve Me')).toBe(false);
    // The fixture challenge we just solved should have moved out of the
    // unsolved set without any other challenge's solved state changing.
    expect(unsolvedAfter.body.data.pagination.total).toBe(totalUnsolvedBefore);
  });

  it('returns an empty solved list for a logged-out (unauthenticated) request', async () => {
    const res = await request(ctx.app).get('/api/v1/challenges?solved=solved');
    expect(res.body.data.challenges).toHaveLength(0);
  });

  it('paginates with a page/limit and reports totalPages', async () => {
    const res = await request(ctx.app).get('/api/v1/challenges?limit=2&page=1');
    expect(res.body.data.challenges).toHaveLength(2);
    expect(res.body.data.pagination.limit).toBe(2);
    expect(res.body.data.pagination.totalPages).toBeGreaterThanOrEqual(2);
  });

  it('rejects a limit above the maximum allowed', async () => {
    const res = await request(ctx.app).get('/api/v1/challenges?limit=1000');
    expect(res.status).toBe(400);
  });

  it('rejects an invalid category filter', async () => {
    const res = await request(ctx.app).get('/api/v1/challenges?category=not-a-category');
    expect(res.status).toBe(400);
  });
});
