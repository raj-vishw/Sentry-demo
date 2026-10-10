import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerUser } from './helpers/auth.js';

describe('First-run setup wizard', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('reports setup as not completed before any admin is created', async () => {
    const res = await request(ctx.app).get('/api/v1/setup/status');
    expect(res.status).toBe(200);
    expect(res.body.data.completed).toBe(false);
  });

  it('rejects an invalid payload without marking setup completed', async () => {
    const res = await request(ctx.app).post('/api/v1/setup/initialize').send({
      username: 'rootadmin',
      email: 'root@example.com',
      password: 'short',
      confirmPassword: 'short',
    });
    expect(res.status).toBe(400);

    const status = await request(ctx.app).get('/api/v1/setup/status');
    expect(status.body.data.completed).toBe(false);
  });

  it('rolls back the setup flag when account creation fails, so setup can be retried', async () => {
    await registerUser(ctx, 'already_taken');

    // Same email as the user just registered above — initialize should
    // reject with a conflict, and critically must not leave the setup flag
    // stuck `true` with no admin ever created (a permanent lockout bug).
    const res = await request(ctx.app).post('/api/v1/setup/initialize').send({
      username: 'rootadmin',
      email: 'already_taken@example.com',
      password: 'SuperSecret123',
      confirmPassword: 'SuperSecret123',
    });
    expect(res.status).toBe(409);

    const status = await request(ctx.app).get('/api/v1/setup/status');
    expect(status.body.data.completed).toBe(false);
  });

  it('creates the first admin, returns a session, and marks setup completed', async () => {
    const res = await request(ctx.app).post('/api/v1/setup/initialize').send({
      username: 'rootadmin',
      email: 'rootadmin@example.com',
      password: 'SuperSecret123',
      confirmPassword: 'SuperSecret123',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('ADMIN');
    expect(res.body.data.accessToken).toBeTypeOf('string');
    const setCookie = res.headers['set-cookie']?.[0] ?? '';
    expect(setCookie).toContain('refreshToken=');

    const status = await request(ctx.app).get('/api/v1/setup/status');
    expect(status.body.data.completed).toBe(true);
  });

  it('rejects a second initialization attempt once setup is already complete', async () => {
    const res = await request(ctx.app).post('/api/v1/setup/initialize').send({
      username: 'anotheradmin',
      email: 'another@example.com',
      password: 'SuperSecret123',
      confirmPassword: 'SuperSecret123',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('Setup has already been completed.');
  });
});
