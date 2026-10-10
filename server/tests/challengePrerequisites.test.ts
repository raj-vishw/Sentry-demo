import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerUser, registerAdmin } from './helpers/auth.js';

describe('Challenge prerequisites (unlock chains)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let gateId: string;
  let gateSlug: string;
  let lockedId: string;
  let lockedSlug: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'prereq_admin');

    const gate = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Gate Challenge',
        description: 'Must be solved before the locked challenge unlocks.',
        category: 'web',
        difficulty: 'EASY',
        points: 50,
        flag: 'CTF{gate}',
        published: true,
        hints: [],
      });
    gateId = gate.body.data.challenge.id;
    gateSlug = gate.body.data.challenge.slug;

    const locked = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Locked Challenge',
        description: 'Requires the gate challenge first.',
        category: 'web',
        difficulty: 'MEDIUM',
        points: 100,
        flag: 'CTF{locked}',
        published: true,
        hints: [],
        prerequisite: gateId,
      });
    lockedId = locked.body.data.challenge.id;
    lockedSlug = locked.body.data.challenge.slug;
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('rejects a self-referencing prerequisite', async () => {
    const created = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Self Reference Attempt',
        description: 'Will be patched to require itself.',
        category: 'web',
        difficulty: 'EASY',
        points: 10,
        flag: 'CTF{self}',
        published: true,
        hints: [],
      });
    const id = created.body.data.challenge.id;
    const res = await request(ctx.app)
      .patch(`/api/v1/admin/challenges/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ prerequisite: id });
    expect(res.status).toBe(400);
  });

  it('rejects chaining a prerequisite onto a challenge that already has one', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Chain Attempt',
        description: 'Tries to require the already-gated locked challenge.',
        category: 'web',
        difficulty: 'EASY',
        points: 10,
        flag: 'CTF{chain}',
        published: true,
        hints: [],
        prerequisite: lockedId,
      });
    expect(res.status).toBe(400);
  });

  it('rejects giving a prerequisite to a challenge that is already someone else\'s prerequisite', async () => {
    // gateId is already `locked`'s prerequisite — it can't also gain one.
    const other = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Would-be prerequisite of the gate',
        description: 'Unused target.',
        category: 'web',
        difficulty: 'EASY',
        points: 10,
        flag: 'CTF{other}',
        published: true,
        hints: [],
      });
    const res = await request(ctx.app)
      .patch(`/api/v1/admin/challenges/${gateId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ prerequisite: other.body.data.challenge.id });
    expect(res.status).toBe(400);
  });

  it('shows the locked challenge as locked in the public list, and gives a teaser detail', async () => {
    const token = await registerUser(ctx, 'prereq_user');

    const list = await request(ctx.app).get('/api/v1/challenges').set('Authorization', `Bearer ${token}`);
    const entry = list.body.data.challenges.find((c: { id: string }) => c.id === lockedId);
    expect(entry.locked).toBe(true);
    // Still discoverable — not filtered out of the list entirely.
    expect(entry.title).toBe('Locked Challenge');

    const detail = await request(ctx.app)
      .get(`/api/v1/challenges/${lockedSlug}`)
      .set('Authorization', `Bearer ${token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.challenge.locked).toBe(true);
    expect(detail.body.data.challenge.description).toBe('');
    expect(detail.body.data.challenge.hints).toEqual([]);
    expect(detail.body.data.challenge.unlockRequirement).toEqual({ title: 'Gate Challenge', slug: gateSlug });
  });

  it('unlocks after the prerequisite is solved', async () => {
    const token = await registerUser(ctx, 'prereq_solver');

    const beforeSolve = await request(ctx.app)
      .get(`/api/v1/challenges/${lockedSlug}`)
      .set('Authorization', `Bearer ${token}`);
    expect(beforeSolve.body.data.challenge.locked).toBe(true);

    await request(ctx.app)
      .post(`/api/v1/challenges/${gateId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ flag: 'CTF{gate}' });

    const afterSolve = await request(ctx.app)
      .get(`/api/v1/challenges/${lockedSlug}`)
      .set('Authorization', `Bearer ${token}`);
    expect(afterSolve.body.data.challenge.locked).toBe(false);
    expect(afterSolve.body.data.challenge.description).toBe('Requires the gate challenge first.');
  });

  it('is never locked for an admin', async () => {
    const detail = await request(ctx.app)
      .get(`/api/v1/challenges/${lockedSlug}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detail.body.data.challenge.locked).toBe(false);
    expect(detail.body.data.challenge.description).not.toBe('');
  });
});
