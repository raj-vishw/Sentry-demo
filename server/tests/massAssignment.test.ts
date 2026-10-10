import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerUser, registerAdmin } from './helpers/auth.js';

// Confirms a client can't widen a request body beyond the whitelisted
// fields each service actually reads. Zod schemas strip unknown keys by
// default and services copy fields explicitly (see challenge.service.ts's
// `if (input.x !== undefined) doc.x = input.x` pattern) — this suite locks
// that behavior in rather than leaving it as an implicit property of the
// code style. (Registration's `role` field already has dedicated coverage
// in auth.test.ts; not repeated here.)
describe('Mass assignment protection', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('ignores extra points/role fields on profile update', async () => {
    const token = await registerUser(ctx, 'mass_assign_user');
    const res = await request(ctx.app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: 'Just a bio.', points: 999999, role: 'ADMIN' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.bio).toBe('Just a bio.');
    expect(res.body.data.user.role).toBe('USER');
    expect(res.body.data.user.points).toBe(0);
  });

  it('ignores an extra inviteCode/points field on team update', async () => {
    const token = await registerUser(ctx, 'mass_assign_owner');
    const created = await request(ctx.app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'MassAssignCrew' });
    const originalInviteCode = created.body.data.team.inviteCode;

    const res = await request(ctx.app)
      .patch('/api/v1/teams/mine')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Updated.', inviteCode: 'HACKED-0000', points: 999999 });

    expect(res.status).toBe(200);
    expect(res.body.data.team.description).toBe('Updated.');
    expect(res.body.data.team.inviteCode).toBe(originalInviteCode);
    expect(res.body.data.team.points).toBe(0);
  });

  it('ignores an extra solves field when an admin updates a challenge', async () => {
    const adminToken = await registerAdmin(ctx, 'mass_assign_admin');
    const created = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Mass Assignment Target',
        description: 'Used to test challenge update whitelisting.',
        category: 'web',
        difficulty: 'EASY',
        points: 100,
        flag: 'CTF{mass_assignment}',
        published: true,
        hints: [],
        solves: 50000,
      });
    // `solves` isn't a creatable field at all — confirm it was never set.
    expect(created.body.data.challenge.solves).toBe(0);
    const challengeId = created.body.data.challenge.id;

    const updated = await request(ctx.app)
      .patch(`/api/v1/admin/challenges/${challengeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ points: 150, solves: 99999 });

    expect(updated.status).toBe(200);
    expect(updated.body.data.challenge.points).toBe(150);
    expect(updated.body.data.challenge.solves).toBe(0);
  });
});
