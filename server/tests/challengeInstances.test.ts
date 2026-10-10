import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerAdmin, registerUser } from './helpers/auth.js';

describe('Interactive challenge instances (NotImplementedRuntime)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;
  let otherUserToken: string;
  let interactiveChallengeId: string;
  let staticChallengeId: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'instance_admin');
    userToken = await registerUser(ctx, 'instance_user');
    otherUserToken = await registerUser(ctx, 'instance_other_user');

    const interactive = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Broken Vault',
        description: 'An interactive web challenge.',
        category: 'web',
        type: 'INTERACTIVE',
        difficulty: 'HARD',
        points: 500,
        flag: 'CTF{interactive_instance}',
        published: true,
        environment: { port: 8080, protocol: 'HTTP', cpuLimit: 1, memoryLimitMb: 512, timeoutSeconds: 3600 },
      });
    interactiveChallengeId = interactive.body.data.challenge.id;

    const staticChallenge = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Static One',
        description: 'A plain static challenge.',
        category: 'forensics',
        type: 'STATIC',
        difficulty: 'EASY',
        points: 100,
        flag: 'CTF{static_one}',
        published: true,
      });
    staticChallengeId = staticChallenge.body.data.challenge.id;
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  let instanceId: string;

  it('creates an instance that honestly reports FAILED rather than pretending to work', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/challenges/${interactiveChallengeId}/instances`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(201);
    expect(res.body.data.instance.status).toBe('FAILED');
    expect(res.body.data.instance.failureReason).toMatch(/not available/i);
    instanceId = res.body.data.instance.id;
  });

  it('records an audit log entry for instance creation', async () => {
    const auditLog = await request(ctx.app)
      .get('/api/v1/admin/audit-logs')
      .query({ action: 'INSTANCE_CREATED' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(auditLog.body.data.entries.length).toBeGreaterThan(0);
  });

  it('rejects creating an instance for a STATIC challenge', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/challenges/${staticChallengeId}/instances`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(400);
  });

  it('lets the owning user fetch their own instance', async () => {
    const res = await request(ctx.app)
      .get(`/api/v1/challenge-instances/${instanceId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.instance.id).toBe(instanceId);
  });

  it("hides another user's instance as a 404, not a 403", async () => {
    const res = await request(ctx.app)
      .get(`/api/v1/challenge-instances/${instanceId}`)
      .set('Authorization', `Bearer ${otherUserToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 501 Not Implemented when asked to stop an instance', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/challenge-instances/${instanceId}/stop`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(501);
  });

  it("rejects another user's attempt to stop someone else's instance as a 404", async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/challenge-instances/${instanceId}/stop`)
      .set('Authorization', `Bearer ${otherUserToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 501 Not Implemented when asked to restart an instance', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/challenge-instances/${instanceId}/restart`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(501);
  });
});
