import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerUser, registerAdmin } from './helpers/auth.js';

describe('Admin CSV export', () => {
  let ctx: TestContext;
  let adminToken: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'export_admin');
    await registerUser(ctx, 'export_user_one');

    const challenge = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Export Target',
        description: 'Used to test CSV export.',
        category: 'web',
        difficulty: 'EASY',
        points: 50,
        flag: 'CTF{export}',
        published: true,
        hints: [],
      });
    const challengeId = challenge.body.data.challenge.id;
    const userToken = await registerUser(ctx, 'export_user_two');
    await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ flag: 'CTF{export}' });
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('rejects a non-admin exporting users', async () => {
    const token = await registerUser(ctx, 'export_rejected_user');
    const res = await request(ctx.app)
      .get('/api/v1/admin/users/export.csv')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('exports users as CSV with a header row and one row per user', async () => {
    const res = await request(ctx.app)
      .get('/api/v1/admin/users/export.csv')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    const lines = res.text.trim().split('\r\n');
    expect(lines[0]).toBe('id,username,email,role,status,points,solvedCount,teamName,createdAt,lastLoginAt');
    expect(lines.length).toBeGreaterThan(1);
    expect(res.text).toContain('export_user_one');
  });

  it('does not shadow /:id with /export.csv (still resolves a real user id)', async () => {
    const list = await request(ctx.app).get('/api/v1/admin/users').set('Authorization', `Bearer ${adminToken}`);
    const someUserId = list.body.data.users[0].id;
    const res = await request(ctx.app)
      .get(`/api/v1/admin/users/${someUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(someUserId);
  });

  it('exports submissions as CSV', async () => {
    const res = await request(ctx.app)
      .get('/api/v1/admin/submissions/export.csv')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    const lines = res.text.trim().split('\r\n');
    expect(lines[0]).toBe('id,username,challengeTitle,category,correct,pointsAwarded,ip,createdAt');
    expect(res.text).toContain('Export Target');
  });

});
