import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerUser, registerAdmin } from './helpers/auth.js';

const ADMIN_CREDS = { identifier: 'maint_admin', password: 'SuperSecret123' };

describe('Maintenance mode', () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, ADMIN_CREDS.identifier);
    userToken = await registerUser(ctx, 'maint_user');

    await request(ctx.app)
      .patch('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ maintenanceMode: true });
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('blocks an unauthenticated request with a distinct maintenance error', async () => {
    const res = await request(ctx.app).get('/api/v1/challenges');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('MAINTENANCE_MODE');
  });

  it('blocks an authenticated non-admin request', async () => {
    const res = await request(ctx.app).get('/api/v1/users/me').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('MAINTENANCE_MODE');
  });

  it('still lets an authenticated admin through', async () => {
    const res = await request(ctx.app).get('/api/v1/admin/settings').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('keeps health checks reachable', async () => {
    const res = await request(ctx.app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('keeps the setup status endpoint reachable', async () => {
    const res = await request(ctx.app).get('/api/v1/setup/status');
    expect(res.status).toBe(200);
  });

  it('keeps the admin login route reachable so an admin can always get back in', async () => {
    const res = await request(ctx.app).post('/api/v1/admin/login').send(ADMIN_CREDS);
    expect(res.status).toBe(200);
  });

  it('is reversible — turning it back off restores normal access', async () => {
    await request(ctx.app)
      .patch('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ maintenanceMode: false });

    const res = await request(ctx.app).get('/api/v1/challenges');
    expect(res.status).toBe(200);
  });
});
