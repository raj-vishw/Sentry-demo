import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerAdmin, registerUser } from './helpers/auth.js';

describe('Leaderboard "hidden" flag', () => {
  let ctx: TestContext;
  let adminToken: string;
  let challengeId: string;
  const FLAG = 'CTF{hidden_leaderboard}';

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'hidden_admin');

    const created = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Hidden Flag Target',
        description: 'Used to test the per-user hidden leaderboard flag.',
        category: 'web',
        difficulty: 'EASY',
        points: 300,
        flag: FLAG,
        published: true,
        hints: [],
      });
    challengeId = created.body.data.challenge.id;
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('a hidden user still earns points, but never appears on the global leaderboard', async () => {
    const userToken = await registerUser(ctx, 'hidden_user');
    const { User } = await import('../src/models/User.js');
    const user = await User.findOne({ username: 'hidden_user' });

    await request(ctx.app)
      .post(`/api/v1/admin/users/${user!.id}/hide`)
      .set('Authorization', `Bearer ${adminToken}`);

    await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ flag: FLAG });

    const profile = await request(ctx.app).get('/api/v1/users/me').set('Authorization', `Bearer ${userToken}`);
    expect(profile.body.data.user.points).toBe(300); // points still accrue

    const board = await request(ctx.app).get('/api/v1/leaderboard').query({ scope: 'global', limit: 50 });
    const entry = board.body.data.entries.find((e: { userId: string }) => e.userId === user!.id);
    expect(entry).toBeUndefined();
  });

  it('ranks compress correctly for visible users — no gap left by a hidden entry', async () => {
    const visibleToken = await registerUser(ctx, 'visible_user');
    await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${visibleToken}`)
      .send({ flag: FLAG });

    const board = await request(ctx.app).get('/api/v1/leaderboard').query({ scope: 'global', limit: 50 });
    const ranks = board.body.data.entries.map((e: { rank: number }) => e.rank);
    const sorted = [...ranks].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i += 1) {
      expect(sorted[i]).toBe(i + 1); // 1,2,3,... no skipped numbers
    }
  });

  it("a hidden user's own rank is still a correct number (nobody non-hidden outscores them)", async () => {
    const login = await request(ctx.app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'hidden_user', password: 'SuperSecret123' });
    const token = login.body.data.accessToken as string;

    const me = await request(ctx.app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`);
    // hidden_user has the same 300 points as visible_user from the prior
    // test — rank is "count of strictly-higher, non-hidden peers, + 1",
    // so a tie at the top still correctly comes out to rank 1.
    expect(me.body.data.user.rank).toBe(1);
  });

  it('a hidden team does not appear on the team leaderboard', async () => {
    const ownerToken = await registerUser(ctx, 'hidden_team_owner');
    const team = await request(ctx.app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Ghost Squad' });
    const teamId = team.body.data.team.id;

    await request(ctx.app)
      .post(`/api/v1/admin/teams/${teamId}/hide`)
      .set('Authorization', `Bearer ${adminToken}`);

    const board = await request(ctx.app).get('/api/v1/leaderboard/teams').query({ limit: 50 });
    const entry = board.body.data.entries.find((e: { teamId: string }) => e.teamId === teamId);
    expect(entry).toBeUndefined();
  });

  it('an admin still sees hidden entries on the leaderboard', async () => {
    const { User } = await import('../src/models/User.js');
    const hiddenUser = await User.findOne({ username: 'hidden_user' });

    const board = await request(ctx.app)
      .get('/api/v1/leaderboard')
      .query({ scope: 'global', limit: 50 })
      .set('Authorization', `Bearer ${adminToken}`);
    const entry = board.body.data.entries.find((e: { userId: string }) => e.userId === hiddenUser!.id);
    expect(entry).toBeDefined();
  });
});
