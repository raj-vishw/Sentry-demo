import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerAdmin, registerUser } from './helpers/auth.js';

describe('Admin broadcast announcements', () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;
  let announcementId: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'announce_admin');
    userToken = await registerUser(ctx, 'announce_user');
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('a non-admin cannot create an announcement', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/admin/announcements')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ message: 'Should not work' });
    expect(res.status).toBe(403);
  });

  it('an admin broadcasts an announcement, which appears in the public feed', async () => {
    const create = await request(ctx.app)
      .post('/api/v1/admin/announcements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ message: 'Server maintenance in 10 minutes.' });
    expect(create.status).toBe(201);
    announcementId = create.body.data.announcement.id;

    const feed = await request(ctx.app).get('/api/v1/public/announcements');
    expect(feed.status).toBe(200);
    expect(feed.body.data.announcements.some((a: { id: string }) => a.id === announcementId)).toBe(true);
  });

  it('the `since` filter only returns strictly newer announcements', async () => {
    const first = await request(ctx.app).get('/api/v1/public/announcements');
    const firstCreatedAt = first.body.data.announcements[0].createdAt;

    const second = await request(ctx.app)
      .post('/api/v1/admin/announcements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ message: 'A second, later announcement.' });
    expect(second.status).toBe(201);

    const filtered = await request(ctx.app)
      .get('/api/v1/public/announcements')
      .query({ since: firstCreatedAt });
    expect(filtered.body.data.announcements.every((a: { id: string }) => a.id !== announcementId)).toBe(true);
    expect(filtered.body.data.announcements.some((a: { id: string }) => a.id === second.body.data.announcement.id)).toBe(
      true,
    );
  });

  it('a non-admin cannot retract an announcement', async () => {
    const res = await request(ctx.app)
      .delete(`/api/v1/admin/announcements/${announcementId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('an admin retracts an announcement, which no longer appears in the feed', async () => {
    const del = await request(ctx.app)
      .delete(`/api/v1/admin/announcements/${announcementId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);

    const feed = await request(ctx.app).get('/api/v1/public/announcements');
    expect(feed.body.data.announcements.some((a: { id: string }) => a.id === announcementId)).toBe(false);
  });

  it('records audit log entries for create and delete', async () => {
    for (const action of ['ADMIN_CREATED_ANNOUNCEMENT', 'ADMIN_DELETED_ANNOUNCEMENT']) {
      const auditLog = await request(ctx.app)
        .get('/api/v1/admin/audit-logs')
        .query({ action })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(auditLog.body.data.entries.length).toBeGreaterThan(0);
    }
  });
});
