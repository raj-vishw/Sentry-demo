import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';
import { registerUser } from './helpers/auth.js';

// Every one of these payloads tries to smuggle a MongoDB query operator
// (e.g. `$ne`, `$gt`) into a field that a raw `find()` would otherwise
// interpret as part of the query. The defense here is structural — every
// input-accepting field is Zod-typed as a primitive `string`/`number`, so
// `safeParse` rejects an object payload outright before it ever reaches a
// Mongoose query. These tests lock that defense in as a regression suite,
// rather than leaving it as an implicit property of "Zod is used everywhere".
describe('NoSQL injection resistance', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
    await registerUser(ctx, 'injection_victim');
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('rejects an operator-object identifier on login instead of matching every user', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/auth/login')
      .send({ identifier: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
  });

  it('rejects an operator-object identifier on login even alongside a valid password string', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/auth/login')
      .send({ identifier: { $gt: '' }, password: 'anything' });
    expect(res.status).toBe(400);
  });

  it('rejects an operator-object email/username on registration', async () => {
    const res = await request(ctx.app).post('/api/v1/auth/register').send({
      username: { $ne: null },
      email: 'ok@example.com',
      password: 'SuperSecret123',
      confirmPassword: 'SuperSecret123',
    });
    expect(res.status).toBe(400);
  });

  it('cannot smuggle a $-operator object into the challenge search filter', async () => {
    // Express 5's default query parser is `simple` (Node's built-in
    // querystring), not `qs` — `search[$ne]=` is parsed as a literal key
    // `"search[$ne]"`, not a nested `search: { $ne: '' }` object, so there
    // is no bracket-notation path to an operator injection here at all.
    // `search` arrives as `undefined`, same as not passing it.
    const res = await request(ctx.app).get('/api/v1/challenges').query({ 'search[$ne]': '' });
    expect(res.status).toBe(200);

    // A literal string containing `$ne` is still just a plain substring
    // search, matched via the regex-escaped pattern in challenge.service.ts
    // — never interpreted as a Mongo operator.
    const literal = await request(ctx.app).get('/api/v1/challenges').query({ search: '$ne' });
    expect(literal.status).toBe(200);
  });

  it('rejects an operator-object invite code on team join', async () => {
    const token = await registerUser(ctx, 'injection_joiner');
    const res = await request(ctx.app)
      .post('/api/v1/teams/join')
      .set('Authorization', `Bearer ${token}`)
      .send({ inviteCode: { $regex: '.*' } });
    expect(res.status).toBe(400);
  });

  it('treats a $-prefixed flag submission as a literal (always-incorrect) string, not an operator', async () => {
    const adminToken = await (await import('./helpers/auth.js')).registerAdmin(ctx, 'injection_admin');
    const challenge = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Injection Target',
        description: 'Used to test flag-field injection resistance.',
        category: 'web',
        difficulty: 'EASY',
        points: 50,
        flag: 'CTF{real_flag}',
        published: true,
        hints: [],
      });
    const challengeId = challenge.body.data.challenge.id;

    const userToken = await registerUser(ctx, 'injection_submitter');
    const res = await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ flag: '{"$ne": null}' });
    expect(res.status).toBe(200);
    expect(res.body.data.correct).toBe(false);
  });
});
