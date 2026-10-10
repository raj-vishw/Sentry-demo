import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerUser, registerAdmin } from './helpers/auth.js';

describe('Reports', () => {
  let ctx: TestContext;
  let adminToken: string;
  let writeupId: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'report_admin');

    const challenge = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Report Target',
        description: 'Used to test the report flow.',
        category: 'web',
        difficulty: 'EASY',
        points: 100,
        flag: 'CTF{report_flag}',
        published: true,
        hints: [],
      });
    const challengeId = challenge.body.data.challenge.id;

    const authorToken = await registerUser(ctx, 'report_target_author');
    await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ flag: 'CTF{report_flag}' });
    const writeup = await request(ctx.app)
      .post('/api/v1/writeups')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ title: 'Reportable Writeup', challengeId, content: 'Some content here. '.repeat(5) });
    writeupId = writeup.body.data.writeup.id;
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('lets an authenticated user report a writeup, then prevents a second open report from them', async () => {
    const token = await registerUser(ctx, 'reporter_one');
    const res = await request(ctx.app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetType: 'writeup', targetId: writeupId, reason: 'This looks plagiarized.' });
    expect(res.status).toBe(201);
    expect(res.body.data.report.status).toBe('OPEN');

    const duplicate = await request(ctx.app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetType: 'writeup', targetId: writeupId, reason: 'Still looks plagiarized.' });
    expect(duplicate.status).toBe(409);
  });

  it('404s when reporting a target that does not exist', async () => {
    const token = await registerUser(ctx, 'reporter_two');
    const res = await request(ctx.app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetType: 'writeup', targetId: '507f1f77bcf86cd799439011', reason: 'Nonexistent target.' });
    expect(res.status).toBe(404);
  });

  it('lets an admin list, resolve, and dismiss reports', async () => {
    const token = await registerUser(ctx, 'reporter_three');
    const created = await request(ctx.app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetType: 'writeup', targetId: writeupId, reason: 'Needs review.' });
    const reportId = created.body.data.report.id;

    const list = await request(ctx.app).get('/api/v1/admin/reports').set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.reports.length).toBeGreaterThan(0);

    const listed = list.body.data.reports.find((r: { id: string }) => r.id === reportId);
    // A real 24-char hex id, not a stringified populated subdocument
    // (`listReports` populates `reporter` — this would catch that regressing).
    expect(listed.reporterId).toMatch(/^[0-9a-f]{24}$/);
    expect(listed.reporterUsername).toBe('reporter_three');

    const resolved = await request(ctx.app)
      .post(`/api/v1/admin/reports/${reportId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resolved.body.data.report.status).toBe('RESOLVED');

    const resolveAgain = await request(ctx.app)
      .post(`/api/v1/admin/reports/${reportId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resolveAgain.status).toBe(409);
  });

  it('rejects a non-admin from reviewing reports', async () => {
    const token = await registerUser(ctx, 'plain_reporter_viewer');
    const res = await request(ctx.app).get('/api/v1/admin/reports').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
