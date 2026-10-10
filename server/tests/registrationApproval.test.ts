import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerAdmin } from './helpers/auth.js';

describe('Registration requires approval', () => {
  let ctx: TestContext;
  let adminToken: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'approval_admin');
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('with approval off (the default): register logs in immediately', async () => {
    const res = await request(ctx.app).post('/api/v1/auth/register').send({
      username: 'reg_normal',
      email: 'reg_normal@example.com',
      password: 'SuperSecret123',
      confirmPassword: 'SuperSecret123',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.pending).toBe(false);
    expect(typeof res.body.data.accessToken).toBe('string');
  });

  it('turning approval on: register returns pending, no tokens, and login is rejected until approved', async () => {
    await request(ctx.app)
      .patch('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ registrationRequiresApproval: true });

    const register = await request(ctx.app).post('/api/v1/auth/register').send({
      username: 'reg_pending',
      email: 'reg_pending@example.com',
      password: 'SuperSecret123',
      confirmPassword: 'SuperSecret123',
    });
    expect(register.status).toBe(201);
    expect(register.body.data.pending).toBe(true);
    expect(register.body.data.accessToken).toBeUndefined();

    const login = await request(ctx.app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'reg_pending', password: 'SuperSecret123' });
    expect(login.status).toBe(403);
  });

  it('admin approves a pending account, which can then log in', async () => {
    const { User } = await import('../src/models/User.js');
    const pendingUser = await User.findOne({ username: 'reg_pending' });
    expect(pendingUser!.status).toBe('PENDING');

    const approve = await request(ctx.app)
      .post(`/api/v1/admin/users/${pendingUser!.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approve.status).toBe(200);
    expect(approve.body.data.user.status).toBe('ACTIVE');

    const login = await request(ctx.app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'reg_pending', password: 'SuperSecret123' });
    expect(login.status).toBe(200);
  });

  it('admin rejects a pending account, which is deleted entirely', async () => {
    const register = await request(ctx.app).post('/api/v1/auth/register').send({
      username: 'reg_rejected',
      email: 'reg_rejected@example.com',
      password: 'SuperSecret123',
      confirmPassword: 'SuperSecret123',
    });
    expect(register.body.data.pending).toBe(true);

    const { User } = await import('../src/models/User.js');
    const pendingUser = await User.findOne({ username: 'reg_rejected' });

    const reject = await request(ctx.app)
      .post(`/api/v1/admin/users/${pendingUser!.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(reject.status).toBe(200);

    const gone = await User.findOne({ username: 'reg_rejected' });
    expect(gone).toBeNull();

    const auditLog = await request(ctx.app)
      .get('/api/v1/admin/audit-logs')
      .query({ action: 'ADMIN_REJECTED_USER' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(auditLog.body.data.entries.length).toBeGreaterThan(0);
  });

  it('cannot approve or reject an account that is not pending', async () => {
    const { User } = await import('../src/models/User.js');
    const normalUser = await User.findOne({ username: 'reg_normal' });

    const approve = await request(ctx.app)
      .post(`/api/v1/admin/users/${normalUser!.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approve.status).toBe(404);

    const reject = await request(ctx.app)
      .post(`/api/v1/admin/users/${normalUser!.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(reject.status).toBe(404);
  });
});
