import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerUser, registerAdmin } from './helpers/auth.js';

describe('Writeups', () => {
  let ctx: TestContext;
  let adminToken: string;
  let challengeId: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'writeup_admin');

    const challenge = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Writeup Target',
        description: 'Used to test the writeup flow.',
        category: 'web',
        difficulty: 'EASY',
        points: 100,
        flag: 'CTF{writeup_flag}',
        published: true,
        hints: [],
      });
    challengeId = challenge.body.data.challenge.id;
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('refuses to create a writeup for a challenge the author has not solved', async () => {
    const token = await registerUser(ctx, 'unsolved_writer');
    const res = await request(ctx.app)
      .post('/api/v1/writeups')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'My Writeup', challengeId, content: 'x'.repeat(60) });
    expect(res.status).toBe(403);
  });

  it('full lifecycle: create as draft, submit, reject, resubmit, approve, visible publicly, like', async () => {
    const token = await registerUser(ctx, 'solver_writer');
    await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ flag: 'CTF{writeup_flag}' });

    const created = await request(ctx.app)
      .post('/api/v1/writeups')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Cracking It', challengeId, content: 'How I solved it. '.repeat(5) });
    expect(created.status).toBe(201);
    expect(created.body.data.writeup.status).toBe('DRAFT');
    const writeupId = created.body.data.writeup.id;
    const slug = created.body.data.writeup.slug;

    // Not visible publicly while a draft.
    const draftLookup = await request(ctx.app).get(`/api/v1/writeups/${slug}`);
    expect(draftLookup.status).toBe(404);

    const submitted = await request(ctx.app)
      .post(`/api/v1/writeups/${writeupId}/submit`)
      .set('Authorization', `Bearer ${token}`);
    expect(submitted.body.data.writeup.status).toBe('PENDING_REVIEW');

    const rejected = await request(ctx.app)
      .post(`/api/v1/admin/writeups/${writeupId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Needs more detail on exploitation.' });
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.writeup.status).toBe('REJECTED');

    // Rejection reason is visible to the author...
    const authorView = await request(ctx.app)
      .get(`/api/v1/writeups/${slug}`)
      .set('Authorization', `Bearer ${token}`);
    expect(authorView.body.data.writeup.rejectionReason).toBe('Needs more detail on exploitation.');

    // ...but the writeup still isn't public, and a stranger gets a 404, not the reason.
    const strangerLookup = await request(ctx.app).get(`/api/v1/writeups/${slug}`);
    expect(strangerLookup.status).toBe(404);

    await request(ctx.app)
      .post(`/api/v1/writeups/${writeupId}/submit`)
      .set('Authorization', `Bearer ${token}`);
    const approved = await request(ctx.app)
      .post(`/api/v1/admin/writeups/${writeupId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approved.body.data.writeup.status).toBe('PUBLISHED');

    const publicView = await request(ctx.app).get(`/api/v1/writeups/${slug}`);
    expect(publicView.status).toBe(200);
    expect(publicView.body.data.writeup.rejectionReason).toBeNull();
    expect(publicView.body.data.writeup.views).toBe(1);

    const liker = await registerUser(ctx, 'writeup_liker');
    const liked = await request(ctx.app)
      .post(`/api/v1/writeups/${writeupId}/like`)
      .set('Authorization', `Bearer ${liker}`);
    expect(liked.body.data).toEqual({ liked: true, likesCount: 1 });

    const unliked = await request(ctx.app)
      .post(`/api/v1/writeups/${writeupId}/like`)
      .set('Authorization', `Bearer ${liker}`);
    expect(unliked.body.data).toEqual({ liked: false, likesCount: 0 });
  });

  it('rejects a second writeup for the same challenge by the same author', async () => {
    const token = await registerUser(ctx, 'double_writer');
    await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ flag: 'CTF{writeup_flag}' });

    await request(ctx.app)
      .post('/api/v1/writeups')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'First One', challengeId, content: 'Content goes here. '.repeat(5) });

    const second = await request(ctx.app)
      .post('/api/v1/writeups')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Second One', challengeId, content: 'Content goes here. '.repeat(5) });
    expect(second.status).toBe(409);
  });

  it('rejects a non-admin from moderating or listing admin writeups', async () => {
    const token = await registerUser(ctx, 'plain_viewer');
    const list = await request(ctx.app).get('/api/v1/admin/writeups').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(403);
  });
});
