import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerAdmin, registerUser } from './helpers/auth.js';

describe('Custom Pages (CMS)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;
  let pageId: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'pages_admin');
    userToken = await registerUser(ctx, 'pages_user');
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('a non-admin cannot create a page', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/admin/pages')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ slug: 'rules', title: 'Rules', content: 'No cheating.' });
    expect(res.status).toBe(403);
  });

  it('an admin creates a page, which appears in the public list and detail endpoints', async () => {
    const create = await request(ctx.app)
      .post('/api/v1/admin/pages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ slug: 'code-of-conduct', title: 'Code of Conduct', content: 'Be excellent to each other.' });
    expect(create.status).toBe(201);
    pageId = create.body.data.page.id;

    const list = await request(ctx.app).get('/api/v1/public/pages');
    expect(list.body.data.pages.some((p: { slug: string }) => p.slug === 'code-of-conduct')).toBe(true);

    const detail = await request(ctx.app).get('/api/v1/public/pages/code-of-conduct');
    expect(detail.status).toBe(200);
    expect(detail.body.data.page.title).toBe('Code of Conduct');
    expect(detail.body.data.page.content).toBe('Be excellent to each other.');
  });

  it('rejects a duplicate slug', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/admin/pages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ slug: 'code-of-conduct', title: 'Duplicate', content: 'x' });
    expect(res.status).toBe(409);
  });

  it('an admin updates a page, which the public endpoint reflects', async () => {
    const update = await request(ctx.app)
      .patch(`/api/v1/admin/pages/${pageId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content: 'Updated content.' });
    expect(update.status).toBe(200);

    const detail = await request(ctx.app).get('/api/v1/public/pages/code-of-conduct');
    expect(detail.body.data.page.content).toBe('Updated content.');
  });

  it('404s for an unknown public slug', async () => {
    const res = await request(ctx.app).get('/api/v1/public/pages/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('an admin deletes a page, after which the public endpoint 404s', async () => {
    const del = await request(ctx.app)
      .delete(`/api/v1/admin/pages/${pageId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);

    const detail = await request(ctx.app).get('/api/v1/public/pages/code-of-conduct');
    expect(detail.status).toBe(404);
  });

  it('records audit log entries for create/update/delete', async () => {
    for (const action of ['ADMIN_CREATED_PAGE', 'ADMIN_UPDATED_PAGE', 'ADMIN_DELETED_PAGE']) {
      const auditLog = await request(ctx.app)
        .get('/api/v1/admin/audit-logs')
        .query({ action })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(auditLog.body.data.entries.length).toBeGreaterThan(0);
    }
  });
});
