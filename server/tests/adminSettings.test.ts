import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerUser, registerAdmin } from './helpers/auth.js';

describe('Admin-configurable platform settings', () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'settings_admin');
    userToken = await registerUser(ctx, 'settings_user');
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('rejects a non-admin from reading settings', async () => {
    const res = await request(ctx.app).get('/api/v1/admin/settings').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(ctx.app).get('/api/v1/admin/settings');
    expect(res.status).toBe(401);
  });

  it('returns the default config to an admin', async () => {
    const res = await request(ctx.app).get('/api/v1/admin/settings').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.config.platformName).toBe('Sentry');
    expect(res.body.data.config.registrationEnabled).toBe(true);
    expect(res.body.data.config.maintenanceMode).toBe(false);
  });

  it('lets an admin update settings and persists the change', async () => {
    const res = await request(ctx.app)
      .patch('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ platformName: 'My CTF', platformDescription: 'A test event.' });
    expect(res.status).toBe(200);
    expect(res.body.data.config.platformName).toBe('My CTF');

    const after = await request(ctx.app).get('/api/v1/admin/settings').set('Authorization', `Bearer ${adminToken}`);
    expect(after.body.data.config.platformName).toBe('My CTF');
    expect(after.body.data.config.platformDescription).toBe('A test event.');
  });

  it('records an audit log entry for the update', async () => {
    const auditLog = await request(ctx.app)
      .get('/api/v1/admin/audit-logs')
      .query({ action: 'ADMIN_UPDATED_SYSTEM_CONFIG' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(auditLog.body.data.entries.length).toBeGreaterThan(0);
  });

  it('rejects an invalid update payload', async () => {
    const res = await request(ctx.app)
      .patch('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ platformName: '' });
    expect(res.status).toBe(400);
  });

  it('blocks public registration once registrationEnabled is turned off', async () => {
    const off = await request(ctx.app)
      .patch('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ registrationEnabled: false });
    expect(off.body.data.config.registrationEnabled).toBe(false);

    const register = await request(ctx.app).post('/api/v1/auth/register').send({
      username: 'blocked_signup',
      email: 'blocked@example.com',
      password: 'SuperSecret123',
      confirmPassword: 'SuperSecret123',
    });
    expect(register.status).toBe(403);
    expect(register.body.error.message).toBe('Registration is currently disabled.');

    // Restore for any later test/run order assumptions.
    await request(ctx.app)
      .patch('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ registrationEnabled: true });
  });
});
