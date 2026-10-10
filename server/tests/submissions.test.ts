import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';

describe('Flag submission', () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;
  let challengeId: string;
  const FLAG = 'CTF{correct_flag_value}';

  beforeAll(async () => {
    ctx = await createTestContext();

    const { User } = await import('../src/models/User.js');
    const { hashPassword } = await import('../src/utils/password.js');
    await User.create({
      username: 'sub_admin',
      email: 'sub_admin@example.com',
      passwordHash: await hashPassword('SuperSecret123'),
      role: 'ADMIN',
    });
    adminToken = (
      await request(ctx.app).post(`/api/v1/${process.env.ADMIN_ROUTE_PREFIX ?? 'admin'}/login`).send({ identifier: 'sub_admin', password: 'SuperSecret123' })
    ).body.data.accessToken;

    userToken = (
      await request(ctx.app).post('/api/v1/auth/register').send({
        username: 'sub_user',
        email: 'sub_user@example.com',
        password: 'SuperSecret123',
        confirmPassword: 'SuperSecret123',
      })
    ).body.data.accessToken;

    const created = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Submission Target',
        description: 'A challenge used purely to test flag submission.',
        category: 'web',
        difficulty: 'EASY',
        points: 200,
        flag: FLAG,
        published: true,
        hints: [],
      });
    challengeId = created.body.data.challenge.id;
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('rejects an incorrect flag without awarding points', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ flag: 'CTF{wrong_guess}' });

    expect(res.status).toBe(200);
    expect(res.body.data.correct).toBe(false);
    expect(res.body.data.pointsAwarded).toBe(0);
  });

  it('accepts the correct flag, awards points, and marks the challenge solved', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ flag: FLAG });

    expect(res.status).toBe(200);
    expect(res.body.data.correct).toBe(true);
    expect(res.body.data.alreadySolved).toBe(false);
    expect(res.body.data.pointsAwarded).toBe(200);

    const profile = await request(ctx.app).get('/api/v1/users/me').set('Authorization', `Bearer ${userToken}`);
    expect(profile.body.data.user.points).toBe(200);
    expect(profile.body.data.user.solvedCount).toBe(1);

    const listed = await request(ctx.app).get('/api/v1/challenges').set('Authorization', `Bearer ${userToken}`);
    const entry = listed.body.data.challenges.find((c: { id: string }) => c.id === challengeId);
    expect(entry.solved).toBe(true);
    expect(entry.solves).toBe(1);
  });

  it('does not award points a second time for a repeat correct submission', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ flag: FLAG });

    expect(res.status).toBe(200);
    expect(res.body.data.correct).toBe(true);
    expect(res.body.data.alreadySolved).toBe(true);
    expect(res.body.data.pointsAwarded).toBe(0);

    const profile = await request(ctx.app).get('/api/v1/users/me').set('Authorization', `Bearer ${userToken}`);
    expect(profile.body.data.user.points).toBe(200); // unchanged
  });

  it('never lets a second user solving the same challenge affect the first user', async () => {
    const secondUserToken = (
      await request(ctx.app).post('/api/v1/auth/register').send({
        username: 'sub_user_two',
        email: 'sub_user_two@example.com',
        password: 'SuperSecret123',
        confirmPassword: 'SuperSecret123',
      })
    ).body.data.accessToken;

    const res = await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${secondUserToken}`)
      .send({ flag: FLAG });

    expect(res.body.data.pointsAwarded).toBe(200);

    const firstUserProfile = await request(ctx.app).get('/api/v1/users/me').set('Authorization', `Bearer ${userToken}`);
    expect(firstUserProfile.body.data.user.points).toBe(200);
  });

  it('requires authentication to submit a flag', async () => {
    const res = await request(ctx.app).post(`/api/v1/challenges/${challengeId}/submit`).send({ flag: FLAG });
    expect(res.status).toBe(401);
  });

  it('rejects a submission with an empty flag', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ flag: '' });
    expect(res.status).toBe(400);
  });

  it('404s when submitting to a non-existent challenge id', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/challenges/000000000000000000000000/submit')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ flag: FLAG });
    expect(res.status).toBe(404);
  });

  it('404s when submitting the correct flag against a draft (unpublished) challenge', async () => {
    const draftFlag = 'CTF{draft_challenge_flag}';
    const draftChallenge = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Draft Target',
        description: 'A draft challenge that must never be submittable.',
        category: 'web',
        difficulty: 'EASY',
        points: 300,
        flag: draftFlag,
        published: false,
        hints: [],
      });
    const draftChallengeId = draftChallenge.body.data.challenge.id;

    const res = await request(ctx.app)
      .post(`/api/v1/challenges/${draftChallengeId}/submit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ flag: draftFlag });

    expect(res.status).toBe(404);
  });

  it('awards points exactly once when two correct submissions race each other concurrently', async () => {
    // Exercises the DB-level unique partial index on {user, challenge,
    // correct:true} (Submission.ts) under an actual race, rather than just
    // trusting the sequential "repeat submission" test above — a race is
    // the one case the sequential test structurally cannot catch, since
    // `await` serializes the two requests.
    const raceChallenge = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Race Condition Target',
        description: 'Used to test concurrent-submission solve uniqueness.',
        category: 'pwn',
        difficulty: 'EASY',
        points: 400,
        flag: 'CTF{race_condition}',
        published: true,
        hints: [],
      });
    const raceChallengeId = raceChallenge.body.data.challenge.id;
    const raceUserToken = (
      await request(ctx.app).post('/api/v1/auth/register').send({
        username: 'race_user',
        email: 'race_user@example.com',
        password: 'SuperSecret123',
        confirmPassword: 'SuperSecret123',
      })
    ).body.data.accessToken;

    const submit = () =>
      request(ctx.app)
        .post(`/api/v1/challenges/${raceChallengeId}/submit`)
        .set('Authorization', `Bearer ${raceUserToken}`)
        .send({ flag: 'CTF{race_condition}' });

    const [first, second] = await Promise.all([submit(), submit()]);
    const awarded = [first, second].filter((r) => r.body.data.pointsAwarded === 400);
    expect(awarded).toHaveLength(1);

    const profile = await request(ctx.app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${raceUserToken}`);
    expect(profile.body.data.user.points).toBe(400);
  });
});
