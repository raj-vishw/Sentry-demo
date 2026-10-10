import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerUser, registerAdmin } from './helpers/auth.js';

describe('Admin category management', () => {
  let ctx: TestContext;
  let adminToken: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'category_admin');

    const { Category } = await import('../src/models/Category.js');
    await Category.create({ slug: 'web', name: 'Web', description: 'Web exploitation.', icon: 'globe', active: true });
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('rejects a non-admin from listing or updating categories', async () => {
    const token = await registerUser(ctx, 'plain_category_viewer');
    const res = await request(ctx.app).get('/api/v1/admin/categories').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('lists categories and updates one by slug', async () => {
    const list = await request(ctx.app).get('/api/v1/admin/categories').set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.categories.some((c: { slug: string }) => c.slug === 'web')).toBe(true);

    const updated = await request(ctx.app)
      .patch('/api/v1/admin/categories/web')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Updated web description.', active: false });
    expect(updated.status).toBe(200);
    expect(updated.body.data.category.description).toBe('Updated web description.');
    expect(updated.body.data.category.active).toBe(false);
  });

  it('404s for an unknown category slug', async () => {
    const res = await request(ctx.app)
      .patch('/api/v1/admin/categories/not-a-real-category')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: true });
    expect(res.status).toBe(404);
  });
});
