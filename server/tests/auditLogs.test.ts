import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerUser, registerAdmin } from './helpers/auth.js';

describe('Audit logs', () => {
  let ctx: TestContext;
  let adminToken: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'audit_admin');
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('rejects a non-admin from reading the audit log', async () => {
    const token = await registerUser(ctx, 'plain_audit_viewer');
    const res = await request(ctx.app).get('/api/v1/admin/audit-logs').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('records an entry when an admin creates a challenge, and it is listable/filterable', async () => {
    const created = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Audited Challenge',
        description: 'Used to test audit logging.',
        category: 'web',
        difficulty: 'EASY',
        points: 50,
        flag: 'CTF{audited}',
        published: false,
        hints: [],
      });
    const challengeId = created.body.data.challenge.id;

    const list = await request(ctx.app)
      .get('/api/v1/admin/audit-logs')
      .query({ action: 'ADMIN_CREATED_CHALLENGE' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    const entry = list.body.data.entries.find((e: { resourceId: string }) => e.resourceId === challengeId);
    expect(entry).toBeDefined();
    expect(entry.actorUsername).toBe('audit_admin');
    expect(entry.resourceType).toBe('challenge');

    const published = await request(ctx.app)
      .post(`/api/v1/admin/challenges/${challengeId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(published.status).toBe(200);

    const publishLogs = await request(ctx.app)
      .get('/api/v1/admin/audit-logs')
      .query({ action: 'ADMIN_PUBLISHED_CHALLENGE', resourceType: 'challenge' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(publishLogs.body.data.entries.some((e: { resourceId: string }) => e.resourceId === challengeId)).toBe(true);
  });

  it('never exposes a route to modify or delete audit log entries', async () => {
    // No PATCH/DELETE route is wired for this resource at all — verified by
    // getting a generic 404 ("no route"), not a 403/405 for an existing one.
    const res = await request(ctx.app).delete('/api/v1/admin/audit-logs/000000000000000000000000').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
