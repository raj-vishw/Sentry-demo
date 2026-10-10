import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerUser, registerAdmin } from './helpers/auth.js';

async function createChallenge(ctx: TestContext, adminToken: string, overrides: Record<string, unknown> = {}) {
  const res = await request(ctx.app)
    .post('/api/v1/admin/challenges')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: 'File Target',
      description: 'Used to test file upload/download.',
      category: 'forensics',
      difficulty: 'EASY',
      points: 50,
      flag: 'CTF{file_target}',
      published: true,
      hints: [],
      ...overrides,
    });
  return res.body.data.challenge.id as string;
}

async function uploadFile(ctx: TestContext, adminToken: string, challengeId: string) {
  const res = await request(ctx.app)
    .post(`/api/v1/admin/challenges/${challengeId}/files`)
    .set('Authorization', `Bearer ${adminToken}`)
    .attach('file', Buffer.from('evidence contents'), 'evidence.txt');
  return res;
}

describe('Challenge file upload/download', () => {
  let ctx: TestContext;
  let adminToken: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'file_admin');
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('lets an admin upload a file to a challenge', async () => {
    const challengeId = await createChallenge(ctx, adminToken);
    const res = await uploadFile(ctx, adminToken, challengeId);
    expect(res.status).toBe(201);
    expect(res.body.data.file.filename).toBe('evidence.txt');
    expect(res.body.data.file.size).toBeGreaterThan(0);
  });

  it('rejects a non-admin uploading a file', async () => {
    const challengeId = await createChallenge(ctx, adminToken);
    const userToken = await registerUser(ctx, 'file_upload_user');
    const res = await request(ctx.app)
      .post(`/api/v1/admin/challenges/${challengeId}/files`)
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', Buffer.from('nope'), 'nope.txt');
    expect(res.status).toBe(403);
  });

  it('lets an authenticated user download a file from a published challenge', async () => {
    const challengeId = await createChallenge(ctx, adminToken);
    const uploaded = await uploadFile(ctx, adminToken, challengeId);
    const fileId = uploaded.body.data.file.id;

    const userToken = await registerUser(ctx, 'file_download_user');
    const res = await request(ctx.app)
      .get(`/api/v1/challenges/${challengeId}/files/${fileId}/download`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.text).toBe('evidence contents');
  });

  it('requires authentication to download a file', async () => {
    const challengeId = await createChallenge(ctx, adminToken);
    const uploaded = await uploadFile(ctx, adminToken, challengeId);
    const fileId = uploaded.body.data.file.id;

    const res = await request(ctx.app).get(`/api/v1/challenges/${challengeId}/files/${fileId}/download`);
    expect(res.status).toBe(401);
  });

  it('404s on a non-existent file id', async () => {
    const challengeId = await createChallenge(ctx, adminToken);
    const userToken = await registerUser(ctx, 'file_404_user');
    const res = await request(ctx.app)
      .get(`/api/v1/challenges/${challengeId}/files/000000000000000000000000/download`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(404);
  });

  it('blocks a non-admin from downloading a file on an unpublished challenge, but allows an admin', async () => {
    // Regression test for the IDOR fix: getChallengeFile() used to load the
    // challenge with no `published` filter, so any authenticated user who
    // knew/guessed a challenge+file id could pull files for a challenge
    // that was never actually released.
    const challengeId = await createChallenge(ctx, adminToken, { published: false });
    const uploaded = await uploadFile(ctx, adminToken, challengeId);
    const fileId = uploaded.body.data.file.id;

    const userToken = await registerUser(ctx, 'file_unpublished_user');
    const blocked = await request(ctx.app)
      .get(`/api/v1/challenges/${challengeId}/files/${fileId}/download`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(blocked.status).toBe(404);

    const allowed = await request(ctx.app)
      .get(`/api/v1/challenges/${challengeId}/files/${fileId}/download`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(allowed.status).toBe(200);
  });
});
