import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerAdmin, registerUser } from './helpers/auth.js';

describe('Scoreboard freeze (display-only)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;
  let challengeId: string;
  const FLAG_BEFORE = 'CTF{before_freeze}';
  const FLAG_AFTER = 'CTF{after_freeze}';

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'freeze_admin');
    userToken = await registerUser(ctx, 'freeze_user');

    const challenge1 = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Freeze Target One',
        description: 'Solved before the freeze.',
        category: 'web',
        difficulty: 'EASY',
        points: 100,
        flag: FLAG_BEFORE,
        published: true,
        hints: [],
      });
    challengeId = challenge1.body.data.challenge.id;

    const challenge2 = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Freeze Target Two',
        description: 'Solved after the freeze.',
        category: 'web',
        difficulty: 'EASY',
        points: 250,
        flag: FLAG_AFTER,
        published: true,
        hints: [],
      });

    await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ flag: FLAG_BEFORE });

    // Freeze at a point strictly after the first solve, strictly before the second.
    const freezeTime = new Date().toISOString();

    await new Promise((resolve) => setTimeout(resolve, 10));

    await request(ctx.app)
      .post(`/api/v1/challenges/${challenge2.body.data.challenge.id}/submit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ flag: FLAG_AFTER });

    await request(ctx.app)
      .patch('/api/v1/admin/competition')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ freezeTime });
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('a solve after the freeze is invisible on the frozen leaderboard but still present on the profile', async () => {
    const board = await request(ctx.app).get('/api/v1/leaderboard').query({ scope: 'global', limit: 50 });
    expect(board.body.data.frozen).toBe(true);

    const entry = board.body.data.entries.find((e: { username: string }) => e.username === 'freeze_user');
    expect(entry.points).toBe(100); // only the pre-freeze solve counts on the frozen board

    const profile = await request(ctx.app).get('/api/v1/users/me').set('Authorization', `Bearer ${userToken}`);
    expect(profile.body.data.user.points).toBe(350); // both solves count for real
  });

  it('admins always see live (unfrozen) standings', async () => {
    const board = await request(ctx.app)
      .get('/api/v1/leaderboard')
      .query({ scope: 'global', limit: 50 })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(board.body.data.frozen).toBe(false);

    const entry = board.body.data.entries.find((e: { username: string }) => e.username === 'freeze_user');
    expect(entry.points).toBe(350);
  });

  it('a submission made after the freeze still succeeds and awards points — scoring is never blocked', async () => {
    const challenge3 = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Freeze Target Three',
        description: 'Submitted well after the freeze is already active.',
        category: 'web',
        difficulty: 'EASY',
        points: 50,
        flag: 'CTF{well_after_freeze}',
        published: true,
        hints: [],
      });

    const res = await request(ctx.app)
      .post(`/api/v1/challenges/${challenge3.body.data.challenge.id}/submit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ flag: 'CTF{well_after_freeze}' });

    expect(res.status).toBe(200);
    expect(res.body.data.pointsAwarded).toBe(50);
  });

  it('weekly/monthly scopes are never frozen', async () => {
    const weekly = await request(ctx.app).get('/api/v1/leaderboard').query({ scope: 'weekly', limit: 50 });
    expect(weekly.body.data.frozen).toBe(false);
  });
});
