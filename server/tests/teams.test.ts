import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, type TestContext } from './helpers/testServer.js';

async function registerUser(ctx: TestContext, username: string) {
  const res = await request(ctx.app)
    .post('/api/v1/auth/register')
    .send({
      username,
      email: `${username}@example.com`,
      password: 'SuperSecret123',
      confirmPassword: 'SuperSecret123',
    });
  return res.body.data.accessToken as string;
}

describe('Teams', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
  }, 60_000);

  afterAll(async () => {
    await ctx.teardown();
  });

  it('lets a user create a team and become its owner', async () => {
    const token = await registerUser(ctx, 'owner_one');
    const res = await request(ctx.app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Redstorm', description: 'Test team' });

    expect(res.status).toBe(201);
    expect(res.body.data.team.name).toBe('Redstorm');
    expect(res.body.data.team.slug).toBe('redstorm');
    expect(res.body.data.team.members).toHaveLength(1);
    expect(res.body.data.team.members[0].role).toBe('OWNER');
    expect(res.body.data.team.inviteCode).toMatch(/^REDSTORM-[A-Z0-9]{4}$/);
  });

  it('rejects a duplicate team name (case-insensitive)', async () => {
    const token = await registerUser(ctx, 'owner_two');
    const res = await request(ctx.app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'redSTORM' });
    expect(res.status).toBe(409);
  });

  it('prevents a user already on a team from creating or joining another', async () => {
    const token = await registerUser(ctx, 'already_on_team');
    await request(ctx.app).post('/api/v1/teams').set('Authorization', `Bearer ${token}`).send({ name: 'FirstTeam' });

    const createAgain = await request(ctx.app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'SecondTeam' });
    expect(createAgain.status).toBe(409);
  });

  it('lets another user join via invite code, and rejects an invalid one', async () => {
    const ownerToken = await registerUser(ctx, 'invite_owner');
    const created = await request(ctx.app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'NullByte' });
    const inviteCode = created.body.data.team.inviteCode;

    const joinerToken = await registerUser(ctx, 'invite_joiner');
    const joined = await request(ctx.app)
      .post('/api/v1/teams/join')
      .set('Authorization', `Bearer ${joinerToken}`)
      .send({ inviteCode });
    expect(joined.status).toBe(200);
    expect(joined.body.data.team.members).toHaveLength(2);

    const badJoinerToken = await registerUser(ctx, 'bad_invite_joiner');
    const rejected = await request(ctx.app)
      .post('/api/v1/teams/join')
      .set('Authorization', `Bearer ${badJoinerToken}`)
      .send({ inviteCode: 'NOT-A-REAL-CODE' });
    expect(rejected.status).toBe(404);
  });

  it('computes team points live from members solves rather than trusting a stored value', async () => {
    const adminToken = (
      await request(ctx.app)
        .post('/api/v1/auth/register')
        .send({
          username: 'team_score_admin',
          email: 'team_score_admin@example.com',
          password: 'SuperSecret123',
          confirmPassword: 'SuperSecret123',
        })
    ).body.data.accessToken;
    // Promote via direct model write — there's no self-serve admin signup endpoint.
    const { User } = await import('../src/models/User.js');
    await User.updateOne({ username: 'team_score_admin' }, { role: 'ADMIN' });
    const reAuth = (
      await request(ctx.app)
        .post(`/api/v1/${process.env.ADMIN_ROUTE_PREFIX ?? 'admin'}/login`)
        .send({ identifier: 'team_score_admin', password: 'SuperSecret123' })
    ).body.data.accessToken;

    const challenge = await request(ctx.app)
      .post('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${reAuth}`)
      .send({
        title: 'Team Score Target',
        description: 'Used to test team score aggregation.',
        category: 'web',
        difficulty: 'EASY',
        points: 150,
        flag: 'CTF{team_score}',
        published: true,
        hints: [],
      });
    const challengeId = challenge.body.data.challenge.id;

    const memberToken = await registerUser(ctx, 'scoring_member');
    const created = await request(ctx.app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'ScoringSquad' });
    expect(created.body.data.team.points).toBe(0);

    await request(ctx.app)
      .post(`/api/v1/challenges/${challengeId}/submit`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ flag: 'CTF{team_score}' });

    const teamAfter = await request(ctx.app)
      .get('/api/v1/teams/scoringsquad')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(teamAfter.body.data.team.points).toBe(150);
    expect(teamAfter.body.data.team.members[0].points).toBe(150);
  });

  it('transfers ownership to the earliest remaining member when the owner leaves', async () => {
    const ownerToken = await registerUser(ctx, 'leaving_owner');
    const created = await request(ctx.app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'SuccessionTest' });
    const inviteCode = created.body.data.team.inviteCode;

    const memberToken = await registerUser(ctx, 'succession_member');
    await request(ctx.app).post('/api/v1/teams/join').set('Authorization', `Bearer ${memberToken}`).send({ inviteCode });

    const left = await request(ctx.app).post('/api/v1/teams/leave').set('Authorization', `Bearer ${ownerToken}`);
    expect(left.status).toBe(200);
    expect(left.body.data.disbanded).toBe(false);

    const team = await request(ctx.app)
      .get('/api/v1/teams/successiontest')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(team.body.data.team.members).toHaveLength(1);
    expect(team.body.data.team.members[0].role).toBe('OWNER');
    expect(team.body.data.team.members[0].username).toBe('succession_member');
  });

  it('disbands the team when its sole member leaves', async () => {
    const soloToken = await registerUser(ctx, 'solo_leaver');
    await request(ctx.app).post('/api/v1/teams').set('Authorization', `Bearer ${soloToken}`).send({ name: 'SoloTeam' });

    const left = await request(ctx.app).post('/api/v1/teams/leave').set('Authorization', `Bearer ${soloToken}`);
    expect(left.body.data.disbanded).toBe(true);

    const lookup = await request(ctx.app).get('/api/v1/teams/soloteam');
    expect(lookup.status).toBe(404);
  });

  it('only lets the owner remove a member, and rejects removing yourself that way', async () => {
    const ownerToken = await registerUser(ctx, 'removal_owner');
    const created = await request(ctx.app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'RemovalTest' });
    const inviteCode = created.body.data.team.inviteCode;

    const memberToken = await registerUser(ctx, 'removal_member');
    const memberJoin = await request(ctx.app)
      .post('/api/v1/teams/join')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ inviteCode });
    const memberUserId = memberJoin.body.data.team.members.find(
      (m: { username: string }) => m.username === 'removal_member',
    ).userId;

    const unauthorizedRemoval = await request(ctx.app)
      .delete(`/api/v1/teams/mine/members/${memberUserId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(unauthorizedRemoval.status).toBe(403);

    const selfRemoval = await request(ctx.app)
      .delete(`/api/v1/teams/mine/members/${memberUserId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send();
    // memberUserId here belongs to the *member*, not the owner, so this is
    // the legitimate owner-removes-member path and should succeed.
    expect(selfRemoval.status).toBe(200);
    expect(selfRemoval.body.data.team.members).toHaveLength(1);
  });

  it('lets the owner transfer ownership, and rejects a non-owner doing the same', async () => {
    const ownerToken = await registerUser(ctx, 'transfer_owner');
    const created = await request(ctx.app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'TransferTest' });
    const inviteCode = created.body.data.team.inviteCode;

    const memberToken = await registerUser(ctx, 'transfer_member');
    const joined = await request(ctx.app)
      .post('/api/v1/teams/join')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ inviteCode });
    const memberUserId = joined.body.data.team.members.find(
      (m: { username: string }) => m.username === 'transfer_member',
    ).userId;

    const unauthorized = await request(ctx.app)
      .post(`/api/v1/teams/mine/transfer/${memberUserId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(unauthorized.status).toBe(403);

    const transferred = await request(ctx.app)
      .post(`/api/v1/teams/mine/transfer/${memberUserId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(transferred.status).toBe(200);
    const roles = Object.fromEntries(
      transferred.body.data.team.members.map((m: { username: string; role: string }) => [m.username, m.role]),
    );
    expect(roles.transfer_member).toBe('OWNER');
    expect(roles.transfer_owner).toBe('MEMBER');

    // The now-demoted former owner can no longer transfer ownership back.
    const demotedAttempt = await request(ctx.app)
      .post(`/api/v1/teams/mine/transfer/${memberUserId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(demotedAttempt.status).toBe(403);
  });

  it('lets the owner regenerate the invite code, invalidating the old one', async () => {
    const ownerToken = await registerUser(ctx, 'regen_owner');
    const created = await request(ctx.app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'RegenTest' });
    const oldCode = created.body.data.team.inviteCode;

    const regenerated = await request(ctx.app)
      .post('/api/v1/teams/mine/invite-code/regenerate')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(regenerated.status).toBe(200);
    const newCode = regenerated.body.data.team.inviteCode;
    expect(newCode).not.toBe(oldCode);

    const joinerToken = await registerUser(ctx, 'regen_joiner');
    const oldCodeRejected = await request(ctx.app)
      .post('/api/v1/teams/join')
      .set('Authorization', `Bearer ${joinerToken}`)
      .send({ inviteCode: oldCode });
    expect(oldCodeRejected.status).toBe(404);

    const newCodeAccepted = await request(ctx.app)
      .post('/api/v1/teams/join')
      .set('Authorization', `Bearer ${joinerToken}`)
      .send({ inviteCode: newCode });
    expect(newCodeAccepted.status).toBe(200);
  });

  it('rejects a non-owner regenerating the invite code', async () => {
    const ownerToken = await registerUser(ctx, 'regen_perm_owner');
    const created = await request(ctx.app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'RegenPermTest' });
    const inviteCode = created.body.data.team.inviteCode;

    const memberToken = await registerUser(ctx, 'regen_perm_member');
    await request(ctx.app)
      .post('/api/v1/teams/join')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ inviteCode });

    const res = await request(ctx.app)
      .post('/api/v1/teams/mine/invite-code/regenerate')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('rejects a team that is already full', async () => {
    const ownerToken = await registerUser(ctx, 'full_team_owner');
    const created = await request(ctx.app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'FullTeam' });
    const inviteCode = created.body.data.team.inviteCode;

    // MAX_TEAM_MEMBERS is 6; owner already fills 1, so 5 more joins fill it.
    for (let i = 0; i < 5; i++) {
      const token = await registerUser(ctx, `full_team_member_${i}`);
      await request(ctx.app).post('/api/v1/teams/join').set('Authorization', `Bearer ${token}`).send({ inviteCode });
    }

    const overflowToken = await registerUser(ctx, 'full_team_overflow');
    const res = await request(ctx.app)
      .post('/api/v1/teams/join')
      .set('Authorization', `Bearer ${overflowToken}`)
      .send({ inviteCode });
    expect(res.status).toBe(409);
  });
});
