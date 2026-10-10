import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerAdmin, registerUser } from './helpers/auth.js';

describe('Challenge type defaulting and DRAFT/PUBLISHED/ARCHIVED lifecycle', () => {
  let ctx: TestContext;
  let adminToken: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    adminToken = await registerAdmin(ctx, 'lifecycle_admin');
    await registerUser(ctx, 'lifecycle_user');
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('reads a pre-existing challenge document with no `type` field as STATIC', async () => {
    const { Challenge } = await import('../src/models/Challenge.js');
    const { hashFlag } = await import('../src/utils/flag.js');
    const { User } = await import('../src/models/User.js');
    const admin = await User.findOne({ username: 'lifecycle_admin' });

    // Bypasses Mongoose entirely — simulates a document written before the
    // `type` field existed, which physically has no `type` key at all.
    const inserted = await Challenge.collection.insertOne({
      title: 'Legacy Challenge',
      slug: 'legacy-challenge',
      description: 'Created before the type field existed.',
      category: 'web',
      difficulty: 'EASY',
      points: 100,
      flagHash: await hashFlag('CTF{legacy}'),
      flagFormat: 'CTF{...}',
      status: 'PUBLISHED',
      author: admin!._id,
      solves: 0,
      files: [],
      tags: [],
      shortDescription: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const res = await request(ctx.app)
      .get(`/api/v1/admin/challenges/${inserted.insertedId.toString()}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.challenge.type).toBe('STATIC');
  });

  it('backfills `status` on documents that pre-date the lifecycle field, from their old `published` value', async () => {
    const { Challenge } = await import('../src/models/Challenge.js');
    const { runStartupMigrations } = await import('../src/config/database.js');
    const { User } = await import('../src/models/User.js');
    const { hashFlag } = await import('../src/utils/flag.js');
    const admin = await User.findOne({ username: 'lifecycle_admin' });

    const base = {
      description: 'Pre-migration document.',
      category: 'web',
      difficulty: 'EASY',
      points: 100,
      flagHash: await hashFlag('CTF{pre_migration}'),
      flagFormat: 'CTF{...}',
      author: admin!._id,
      solves: 0,
      files: [],
      tags: [],
      shortDescription: '',
      type: 'STATIC',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const wasPublished = await Challenge.collection.insertOne({
      ...base,
      title: 'Was Published',
      slug: 'was-published',
      published: true,
    } as never);
    const wasDraft = await Challenge.collection.insertOne({
      ...base,
      title: 'Was Draft',
      slug: 'was-draft',
      published: false,
    } as never);

    await runStartupMigrations();

    const publishedDoc = await Challenge.findById(wasPublished.insertedId);
    const draftDoc = await Challenge.findById(wasDraft.insertedId);
    expect(publishedDoc!.status).toBe('PUBLISHED');
    expect(draftDoc!.status).toBe('DRAFT');
  });

  it('rejects publishing an INTERACTIVE challenge with no environment definition', async () => {
    const create = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Broken Vault',
        description: 'An interactive web challenge with no environment yet.',
        category: 'web',
        type: 'INTERACTIVE',
        difficulty: 'HARD',
        points: 500,
        flag: 'CTF{interactive}',
        published: false,
      });
    expect(create.status).toBe(201);
    expect(create.body.data.challenge.type).toBe('INTERACTIVE');
    const id = create.body.data.challenge.id;

    const publish = await request(ctx.app)
      .post(`/api/v1/admin/challenges/${id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(publish.status).toBe(400);

    const withEnv = await request(ctx.app)
      .patch(`/api/v1/admin/challenges/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ environment: { port: 8080, protocol: 'HTTP', cpuLimit: 1, memoryLimitMb: 512, timeoutSeconds: 3600 } });
    expect(withEnv.status).toBe(200);

    const publishAgain = await request(ctx.app)
      .post(`/api/v1/admin/challenges/${id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(publishAgain.status).toBe(200);
    expect(publishAgain.body.data.challenge.status).toBe('PUBLISHED');
  });

  it('archives a published challenge, hides it from the player list, and only restore-to-draft can bring it back', async () => {
    const create = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'To Be Archived',
        description: 'A challenge that will be archived in this test.',
        category: 'web',
        difficulty: 'EASY',
        points: 100,
        flag: 'CTF{archive_me}',
        published: true,
      });
    const id = create.body.data.challenge.id;
    const slug = create.body.data.challenge.slug;

    const list = await request(ctx.app).get('/api/v1/challenges');
    expect(list.body.data.challenges.some((c: { slug: string }) => c.slug === slug)).toBe(true);

    const archive = await request(ctx.app)
      .post(`/api/v1/admin/challenges/${id}/archive`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(archive.status).toBe(200);
    expect(archive.body.data.challenge.status).toBe('ARCHIVED');

    const listAfterArchive = await request(ctx.app).get('/api/v1/challenges');
    expect(listAfterArchive.body.data.challenges.some((c: { slug: string }) => c.slug === slug)).toBe(false);

    const publishWhileArchived = await request(ctx.app)
      .post(`/api/v1/admin/challenges/${id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(publishWhileArchived.status).toBe(400);

    const restore = await request(ctx.app)
      .post(`/api/v1/admin/challenges/${id}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(restore.status).toBe(200);
    expect(restore.body.data.challenge.status).toBe('DRAFT');

    const restoreAgain = await request(ctx.app)
      .post(`/api/v1/admin/challenges/${id}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(restoreAgain.status).toBe(400);
  });
});
