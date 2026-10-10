import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerAdmin } from './helpers/auth.js';

describe('Public platform config endpoint', () => {
  let ctx: TestContext;
  let adminToken: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'config_admin');
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('exposes only the safe subset, with no auth required', async () => {
    const res = await request(ctx.app).get('/api/v1/public/platform-config');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      platformName: 'Sentry',
      platformDescription: '',
      logoUrl: null,
      faviconUrl: null,
      accentColor: null,
      bootMessage: null,
      competitionName: '',
      startTime: null,
      endTime: null,
    });
  });

  it('reflects branding changes made through the admin settings endpoint', async () => {
    await request(ctx.app)
      .patch('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ accentColor: '#ff00aa', bootMessage: 'Welcome, operator.' });

    const res = await request(ctx.app).get('/api/v1/public/platform-config');
    expect(res.body.data.accentColor).toBe('#ff00aa');
    expect(res.body.data.bootMessage).toBe('Welcome, operator.');
  });

  it('never exposes registrationEnabled or maintenanceMode', async () => {
    const res = await request(ctx.app).get('/api/v1/public/platform-config');
    expect(res.body.data.registrationEnabled).toBeUndefined();
    expect(res.body.data.maintenanceMode).toBeUndefined();
  });
});
