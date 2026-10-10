import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerUser, registerAdmin } from './helpers/auth.js';

describe('BANNED status', () => {
  let ctx: TestContext;
  let adminToken: string;
  let adminId: string;
  let bannedUserId: string;
  let bannedToken: string;
  let challengeId: string;
  let hintId: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'ban_admin');

    const { User } = await import('../src/models/User.js');
    const admin = await User.findOne({ username: 'ban_admin' });
    adminId = admin!.id;

    const created = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Ban Test Target',
        description: 'Used to test ban enforcement on submission/hints.',
        category: 'web',
        difficulty: 'EASY',
        points: 200,
        flag: 'CTF{ban_test}',
        published: true,
        hints: [{ title: 'A hint', content: 'Some clue.', cost: 0, order: 0 }],
      });
    challengeId = created.body.data.challenge.id;
    hintId = created.body.data.challenge.hints[0].id;

    bannedToken = await registerUser(ctx, 'ban_target');
    const target = await User.findOne({ username: 'ban_target' });
    bannedUserId = target!.id;

    const banRes = await request(ctx.app)
      .post(`/api/v1/admin/users/${bannedUserId}/ban`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(banRes.status).toBe(200);
    expect(banRes.body.data.user.status).toBe('BANNED');
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('a banned account can still log in and fetch its own profile', async () => {
    const login = await request(ctx.app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'ban_target', password: 'SuperSecret123' });
    expect(login.status).toBe(200);

    const me = await request(ctx.app).get('/api/v1/users/me').set('Authorization', `Bearer ${bannedToken}`);
    expect(me.status).toBe(200);
  });

  it('rejects a flag submission from a banned account', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${bannedToken}`)
      .send({ flag: 'CTF{ban_test}' });
    expect(res.status).toBe(403);
  });

  it('rejects a hint unlock from a banned account', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/hints/${hintId}/unlock`)
      .set('Authorization', `Bearer ${bannedToken}`);
    expect(res.status).toBe(403);
  });

  it('rejects team creation from a banned account', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${bannedToken}`)
      .send({ name: 'Banned Crew' });
    expect(res.status).toBe(403);
  });

  it('rejects joining a team from a banned account', async () => {
    const ownerToken = await registerUser(ctx, 'ban_team_owner');
    const team = await request(ctx.app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Open Crew' });
    const inviteCode = team.body.data.team.inviteCode;

    const res = await request(ctx.app)
      .post('/api/v1/teams/join')
      .set('Authorization', `Bearer ${bannedToken}`)
      .send({ inviteCode });
    expect(res.status).toBe(403);
  });

  it('rejects writeup creation from a banned account', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/writeups')
      .set('Authorization', `Bearer ${bannedToken}`)
      .send({
        title: 'My Writeup',
        challengeId,
        content: 'Some content about the challenge, written out long enough to pass validation.',
      });
    expect(res.status).toBe(403);
  });

  it('contrast: DISABLED still blocks login entirely', async () => {
    const disableToken = await registerUser(ctx, 'disable_target');
    const { User } = await import('../src/models/User.js');
    const disabledUser = await User.findOne({ username: 'disable_target' });

    await request(ctx.app)
      .post(`/api/v1/admin/users/${disabledUser!.id}/disable`)
      .set('Authorization', `Bearer ${adminToken}`);

    const login = await request(ctx.app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'disable_target', password: 'SuperSecret123' });
    expect(login.status).toBe(403);

    const me = await request(ctx.app).get('/api/v1/users/me').set('Authorization', `Bearer ${disableToken}`);
    expect(me.status).toBe(200); // existing access token still works until it expires/refreshes
  });

  it('an admin cannot ban themselves', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/admin/users/${adminId}/ban`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('records an audit log entry for the ban', async () => {
    const auditLog = await request(ctx.app)
      .get('/api/v1/admin/audit-logs')
      .query({ action: 'ADMIN_BANNED_USER' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(auditLog.body.data.entries.length).toBeGreaterThan(0);
  });
});
