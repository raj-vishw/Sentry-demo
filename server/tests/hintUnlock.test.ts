import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerUser, registerAdmin } from './helpers/auth.js';

describe('Hint unlock spend logic', () => {
  let ctx: TestContext;
  let adminToken: string;
  let challengeId: string;
  let hintId: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'hint_admin');

    const created = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Hint Spend Target',
        description: 'Used to test hint point-deduction logic.',
        category: 'crypto',
        difficulty: 'EASY',
        points: 50,
        flag: 'CTF{hint_spend}',
        published: true,
        hints: [{ title: 'Costly hint', content: 'The secret clue.', cost: 30, order: 0 }],
      });
    challengeId = created.body.data.challenge.id;
    hintId = created.body.data.challenge.hints[0].id;
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('rejects unlocking a hint when the user does not have enough points', async () => {
    const token = await registerUser(ctx, 'hint_poor_user');
    const res = await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/hints/${hintId}/unlock`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);

    const profile = await request(ctx.app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`);
    expect(profile.body.data.user.points).toBe(0);
  });

  it('deducts points exactly once on unlock, and a repeat unlock is a free no-op', async () => {
    const token = await registerUser(ctx, 'hint_rich_user');

    // Solve a cheap throwaway challenge to earn enough points to afford the hint.
    const funding = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Hint Funding Target',
        description: 'Used purely to fund the hint-unlock test with points.',
        category: 'crypto',
        difficulty: 'EASY',
        points: 40,
        flag: 'CTF{hint_funding}',
        published: true,
        hints: [],
      });
    const fundingChallengeId = funding.body.data.challenge.id;
    await request(ctx.app)
      .post(`/api/v1/challenges/${fundingChallengeId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ flag: 'CTF{hint_funding}' });

    const stillPoor = await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/hints/${hintId}/unlock`)
      .set('Authorization', `Bearer ${token}`);
    // 40 points earned, hint costs 30 — affordable now but wasn't before funding.
    expect(stillPoor.status).toBe(200);
    expect(stillPoor.body.data.content).toBe('The secret clue.');

    const afterFirstUnlock = await request(ctx.app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(afterFirstUnlock.body.data.user.points).toBe(10); // 40 - 30

    const repeat = await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/hints/${hintId}/unlock`)
      .set('Authorization', `Bearer ${token}`);
    expect(repeat.status).toBe(200);
    expect(repeat.body.data.content).toBe('The secret clue.');

    const afterRepeat = await request(ctx.app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`);
    expect(afterRepeat.body.data.user.points).toBe(10); // unchanged — no double charge
  });
});
