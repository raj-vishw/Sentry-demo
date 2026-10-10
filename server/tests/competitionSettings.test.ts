import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerAdmin, registerUser } from './helpers/auth.js';

describe('Competition settings', () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'competition_admin');
    userToken = await registerUser(ctx, 'competition_user');
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('rejects a non-admin from reading or writing competition settings', async () => {
    const get = await request(ctx.app).get('/api/v1/admin/competition').set('Authorization', `Bearer ${userToken}`);
    expect(get.status).toBe(403);
    const patch = await request(ctx.app)
      .patch('/api/v1/admin/competition')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Hijacked' });
    expect(patch.status).toBe(403);
  });

  it('returns sensible defaults, distinct from platform settings', async () => {
    const res = await request(ctx.app).get('/api/v1/admin/competition').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.config.name).toBe('');
    expect(res.body.data.config.leaderboardVisibility).toBe('public');
  });

  it('lets an admin update competition settings and persists the change', async () => {
    const res = await request(ctx.app)
      .patch('/api/v1/admin/competition')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Autumn CTF 2026', description: 'A one-weekend community event.', rules: 'Be excellent to each other.' });
    expect(res.status).toBe(200);
    expect(res.body.data.config.name).toBe('Autumn CTF 2026');

    const auditLog = await request(ctx.app)
      .get('/api/v1/admin/audit-logs')
      .query({ action: 'ADMIN_UPDATED_COMPETITION_CONFIG' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(auditLog.body.data.entries.length).toBeGreaterThan(0);
  });

  it('is independent of platform settings', async () => {
    await request(ctx.app)
      .patch('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ platformName: 'Changed Platform Name' });

    const competition = await request(ctx.app)
      .get('/api/v1/admin/competition')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(competition.body.data.config.name).toBe('Autumn CTF 2026');
  });

  it('hides the leaderboard from non-admins once leaderboardVisibility is set to hidden, but not from admins', async () => {
    await request(ctx.app)
      .patch('/api/v1/admin/competition')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ leaderboardVisibility: 'hidden' });

    const asUser = await request(ctx.app).get('/api/v1/leaderboard').set('Authorization', `Bearer ${userToken}`);
    expect(asUser.body.data.hidden).toBe(true);
    expect(asUser.body.data.entries).toEqual([]);

    const asLoggedOut = await request(ctx.app).get('/api/v1/leaderboard');
    expect(asLoggedOut.body.data.hidden).toBe(true);

    const asAdmin = await request(ctx.app).get('/api/v1/leaderboard').set('Authorization', `Bearer ${adminToken}`);
    expect(asAdmin.body.data.hidden).toBe(false);

    // Restore for test isolation within this file.
    await request(ctx.app)
      .patch('/api/v1/admin/competition')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ leaderboardVisibility: 'public' });
  });
});
