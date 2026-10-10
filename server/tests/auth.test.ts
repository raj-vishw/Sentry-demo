import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';

describe('Authentication', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  const credentials = {
    username: 'operator_01',
    email: 'operator01@example.com',
    password: 'SuperSecret123',
    confirmPassword: 'SuperSecret123',
  };

  it('registers a new user as role USER, never ADMIN, and ignores a client-supplied role', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/auth/register')
      .send({ ...credentials, role: 'ADMIN' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('USER');
    expect(res.body.data.user.email).toBe(credentials.email);
    expect(res.body.data.accessToken).toBeTypeOf('string');
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.user.passwordHash).toBeUndefined();

    const cookies = res.headers['set-cookie'];
    expect(cookies?.some((c: string) => c.startsWith('refreshToken='))).toBe(true);
    expect(cookies?.some((c: string) => /HttpOnly/i.test(c))).toBe(true);
  });

  it('rejects registration with a duplicate email', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/auth/register')
      .send({ ...credentials, username: 'someone_else' });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects registration with a duplicate username', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/auth/register')
      .send({ ...credentials, email: 'another@example.com' });
    expect(res.status).toBe(409);
  });

  it('rejects registration when passwords do not match', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/auth/register')
      .send({ ...credentials, username: 'mismatch', email: 'mismatch@example.com', confirmPassword: 'different' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('logs in with correct credentials', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/auth/login')
      .send({ identifier: credentials.username, password: credentials.password });
    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe(credentials.username);
    expect(res.body.data.accessToken).toBeTypeOf('string');
  });

  it('logs in with email as the identifier', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/auth/login')
      .send({ identifier: credentials.email, password: credentials.password });
    expect(res.status).toBe(200);
  });

  it('rejects login with the wrong password', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/auth/login')
      .send({ identifier: credentials.username, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('rejects login for a non-existent user with the same generic message', async () => {
    const wrongUser = await request(ctx.app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'nobody-here', password: 'whatever123' });
    const wrongPassword = await request(ctx.app)
      .post('/api/v1/auth/login')
      .send({ identifier: credentials.username, password: 'wrong-password' });

    expect(wrongUser.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    expect(wrongUser.body.error.message).toBe(wrongPassword.body.error.message);
  });

  it('rejects an unauthenticated request to a protected route', async () => {
    const res = await request(ctx.app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('allows an authenticated request with a valid access token', async () => {
    const login = await request(ctx.app)
      .post('/api/v1/auth/login')
      .send({ identifier: credentials.username, password: credentials.password });
    const token = login.body.data.accessToken;

    const res = await request(ctx.app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe(credentials.username);
  });

  it('rejects a garbage/invalid access token', async () => {
    const res = await request(ctx.app).get('/api/v1/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('refreshes the access token using the HttpOnly cookie and rotates it', async () => {
    const agent = request.agent(ctx.app);
    await agent.post('/api/v1/auth/login').send({ identifier: credentials.username, password: credentials.password });

    const refreshRes = await agent.post('/api/v1/auth/refresh');
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeTypeOf('string');
  });

  it('rejects refresh when no session cookie is present', async () => {
    const res = await request(ctx.app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('invalidates the session on logout — a subsequent refresh fails', async () => {
    const agent = request.agent(ctx.app);
    const login = await agent
      .post('/api/v1/auth/login')
      .send({ identifier: credentials.username, password: credentials.password });
    const token = login.body.data.accessToken;

    const logoutRes = await agent.post('/api/v1/auth/logout').set('Authorization', `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);

    const refreshAfterLogout = await agent.post('/api/v1/auth/refresh');
    expect(refreshAfterLogout.status).toBe(401);
  });
});
