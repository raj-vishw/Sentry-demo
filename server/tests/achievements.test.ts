import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerUser, registerAdmin } from './helpers/auth.js';

async function createPublishedChallenge(
  ctx: TestContext,
  adminToken: string,
  overrides: Record<string, unknown> = {},
) {
  const res = await request(ctx.app)
    .post('/api/v1/admin/challenges')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: 'Achievement Target',
      description: 'Used to test achievement awarding.',
      category: 'web',
      difficulty: 'EASY',
      points: 50,
      flag: 'CTF{achievement}',
      published: true,
      hints: [],
      ...overrides,
    });
  return res.body.data.challenge as { id: string; slug: string };
}

describe('Achievements', () => {
  let ctx: TestContext;
  let adminToken: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'achievement_admin');
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('awards FIRST_SOLVE and FIRST_BLOOD on a user\'s first correct solve', async () => {
    const challenge = await createPublishedChallenge(ctx, adminToken, {
      title: 'First Blood Target',
      flag: 'CTF{first_blood}',
    });
    const token = await registerUser(ctx, 'achievement_solver_one');

    const res = await request(ctx.app)
      .post(`/api/v1/challenges/${challenge.id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ flag: 'CTF{first_blood}' });

    expect(res.status).toBe(200);
    const types = res.body.data.newAchievements.map((a: { type: string }) => a.type);
    expect(types).toContain('FIRST_SOLVE');
    expect(types).toContain('FIRST_BLOOD');
  });

  it('does not award FIRST_BLOOD to a second solver of the same challenge', async () => {
    const challenge = await createPublishedChallenge(ctx, adminToken, {
      title: 'Second Blood Target',
      flag: 'CTF{second_blood}',
    });
    const firstToken = await registerUser(ctx, 'achievement_first_solver');
    await request(ctx.app)
      .post(`/api/v1/challenges/${challenge.id}/submit`)
      .set('Authorization', `Bearer ${firstToken}`)
      .send({ flag: 'CTF{second_blood}' });

    const secondToken = await registerUser(ctx, 'achievement_solver_two');
    const res = await request(ctx.app)
      .post(`/api/v1/challenges/${challenge.id}/submit`)
      .set('Authorization', `Bearer ${secondToken}`)
      .send({ flag: 'CTF{second_blood}' });

    const types = res.body.data.newAchievements.map((a: { type: string }) => a.type);
    expect(types).not.toContain('FIRST_BLOOD');
    expect(types).toContain('FIRST_SOLVE');
  });

  it('never awards the same achievement type twice (unique index, not just application logic)', async () => {
    const challengeA = await createPublishedChallenge(ctx, adminToken, {
      title: 'Idempotency Target A',
      flag: 'CTF{idempotent_a}',
    });
    const challengeB = await createPublishedChallenge(ctx, adminToken, {
      title: 'Idempotency Target B',
      category: 'crypto',
      flag: 'CTF{idempotent_b}',
    });
    const token = await registerUser(ctx, 'achievement_repeat_user');

    const first = await request(ctx.app)
      .post(`/api/v1/challenges/${challengeA.id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ flag: 'CTF{idempotent_a}' });
    expect(first.body.data.newAchievements.map((a: { type: string }) => a.type)).toContain('FIRST_SOLVE');

    // A second, different solve must NOT re-award FIRST_SOLVE.
    const second = await request(ctx.app)
      .post(`/api/v1/challenges/${challengeB.id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ flag: 'CTF{idempotent_b}' });
    expect(second.body.data.newAchievements.map((a: { type: string }) => a.type)).not.toContain('FIRST_SOLVE');
  });

  it('awards CATEGORY_MASTER_<slug> once every published challenge in that category is solved', async () => {
    const token = await registerUser(ctx, 'achievement_cat_master');
    const c1 = await createPublishedChallenge(ctx, adminToken, {
      title: 'Forensics Master A',
      category: 'forensics',
      flag: 'CTF{forensics_a}',
    });
    const c2 = await createPublishedChallenge(ctx, adminToken, {
      title: 'Forensics Master B',
      category: 'forensics',
      flag: 'CTF{forensics_b}',
    });

    const firstSolve = await request(ctx.app)
      .post(`/api/v1/challenges/${c1.id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ flag: 'CTF{forensics_a}' });
    expect(firstSolve.body.data.newAchievements.map((a: { type: string }) => a.type)).not.toContain(
      'CATEGORY_MASTER_forensics',
    );

    const secondSolve = await request(ctx.app)
      .post(`/api/v1/challenges/${c2.id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ flag: 'CTF{forensics_b}' });
    expect(secondSolve.body.data.newAchievements.map((a: { type: string }) => a.type)).toContain(
      'CATEGORY_MASTER_forensics',
    );
  });

  it('awards TEAM_FOUNDER on team creation', async () => {
    const token = await registerUser(ctx, 'achievement_founder');
    await request(ctx.app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'FounderSquad' });

    const profile = await request(ctx.app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`);
    const badgeTypes = profile.body.data.badges.map((b: { type: string }) => b.type);
    expect(badgeTypes).toContain('TEAM_FOUNDER');
  });

  it('awards FIRST_WRITEUP_PUBLISHED when an admin approves a writeup', async () => {
    const challenge = await createPublishedChallenge(ctx, adminToken, {
      title: 'Writeup Achievement Target',
      flag: 'CTF{writeup_achievement}',
    });
    const token = await registerUser(ctx, 'achievement_writer');
    await request(ctx.app)
      .post(`/api/v1/challenges/${challenge.id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ flag: 'CTF{writeup_achievement}' });

    const created = await request(ctx.app)
      .post('/api/v1/writeups')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Achievement Writeup', challengeId: challenge.id, content: 'Some real content here. '.repeat(5) });
    const writeupId = created.body.data.writeup.id;

    await request(ctx.app).post(`/api/v1/writeups/${writeupId}/submit`).set('Authorization', `Bearer ${token}`);
    await request(ctx.app)
      .post(`/api/v1/admin/writeups/${writeupId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    const profile = await request(ctx.app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`);
    const badgeTypes = profile.body.data.badges.map((b: { type: string }) => b.type);
    expect(badgeTypes).toContain('FIRST_WRITEUP_PUBLISHED');
  });
});
