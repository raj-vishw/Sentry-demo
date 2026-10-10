import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';

describe('Leaderboard', () => {
  let ctx: TestContext;
  let adminToken: string;

  async function registerUser(username: string) {
    const res = await request(ctx.app)
      .post('/api/v1/auth/register')
      .send({
        username,
        email: `${username}@example.com`,
        password: 'SuperSecret123',
        confirmPassword: 'SuperSecret123',
      });
    return res.body.data.accessToken as string;
  }

  async function createChallenge(title: string, points: number, flag: string) {
    const res = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title,
        description: 'Leaderboard test fixture.',
        category: 'web',
        difficulty: 'EASY',
        points,
        flag,
        published: true,
        hints: [],
      });
    return res.body.data.challenge.id as string;
  }

  async function solve(token: string, challengeId: string, flag: string) {
    return request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ flag });
  }

  beforeAll(async () => {
    ctx = await createTestContext();

    const { User } = await import('../src/models/User.js');
    const { hashPassword } = await import('../src/utils/password.js');
    await User.create({
      username: 'lb_admin',
      email: 'lb_admin@example.com',
      passwordHash: await hashPassword('SuperSecret123'),
      role: 'ADMIN',
    });
    adminToken = (
      await request(ctx.app).post(`/api/v1/${process.env.ADMIN_ROUTE_PREFIX ?? 'admin'}/login`).send({ identifier: 'lb_admin', password: 'SuperSecret123' })
    ).body.data.accessToken;
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('ranks users by points descending', async () => {
    const challengeId = await createChallenge('LB Challenge A', 300, 'CTF{lb_a}');

    const highToken = await registerUser('lb_high');
    const lowToken = await registerUser('lb_low');
    await solve(highToken, challengeId, 'CTF{lb_a}');
    // lowToken deliberately does not solve anything.

    const res = await request(ctx.app).get('/api/v1/leaderboard');
    expect(res.status).toBe(200);
    const usernames = res.body.data.entries.map((e: { username: string }) => e.username);
    expect(usernames.indexOf('lb_high')).toBeLessThan(usernames.indexOf('lb_low'));
    expect(res.body.data.entries[0].rank).toBe(1);
  });

  it('paginates and reports a total/totalPages', async () => {
    const res = await request(ctx.app).get('/api/v1/leaderboard?page=1&limit=1');
    expect(res.status).toBe(200);
    expect(res.body.data.entries).toHaveLength(1);
    expect(res.body.data.pagination.limit).toBe(1);
    expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(2);
  });

  it("reports the caller's own rank even when off the visible page", async () => {
    const challengeId = await createChallenge('LB Challenge B', 50, 'CTF{lb_b}');
    const obscureToken = await registerUser('lb_obscure');
    await solve(obscureToken, challengeId, 'CTF{lb_b}');

    const res = await request(ctx.app)
      .get('/api/v1/leaderboard?page=1&limit=1')
      .set('Authorization', `Bearer ${obscureToken}`);

    expect(res.body.data.me).not.toBeNull();
    expect(res.body.data.me.username).toBe('lb_obscure');
    expect(res.body.data.me.onPage).toBe(false);
    expect(res.body.data.entries.some((e: { username: string }) => e.username === 'lb_obscure')).toBe(false);
  });

  it('omits "me" entirely for a logged-out request', async () => {
    const res = await request(ctx.app).get('/api/v1/leaderboard');
    expect(res.body.data.me).toBeNull();
  });

  it('rejects an invalid scope', async () => {
    const res = await request(ctx.app).get('/api/v1/leaderboard?scope=eternal');
    expect(res.status).toBe(400);
  });

  it('ranks teams by the sum of their members points', async () => {
    const challengeId = await createChallenge('LB Team Challenge', 400, 'CTF{lb_team}');
    const ownerToken = await registerUser('lb_team_owner');
    await request(ctx.app).post('/api/v1/teams').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'LBTeam' });
    await solve(ownerToken, challengeId, 'CTF{lb_team}');

    const res = await request(ctx.app).get('/api/v1/leaderboard/teams');
    expect(res.status).toBe(200);
    const entry = res.body.data.entries.find((e: { name: string }) => e.name === 'LBTeam');
    expect(entry).toBeDefined();
    expect(entry.points).toBe(400);
    expect(entry.memberCount).toBe(1);
  });
});
