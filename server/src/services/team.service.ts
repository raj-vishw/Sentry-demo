import { Types } from 'mongoose';
import { Team, MAX_TEAM_MEMBERS, type TeamDoc } from '../models/Team.js';
import { User } from '../models/User.js';
import { Challenge } from '../models/Challenge.js';
import { CATEGORY_SLUGS } from '../models/Category.js';
import { AppError } from '../utils/errors.js';
import { slugify } from '../utils/slug.js';
import { generateInviteCode } from '../utils/inviteCode.js';
import { awardTeamFounder } from './achievement.service.js';
import { assertNotBanned } from './userStatus.service.js';
import { record as recordAudit } from './auditLog.service.js';
import type { CreateTeamInput, UpdateTeamInput } from '../validators/team.schema.js';

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || 'team';
  let candidate = base;
  let suffix = 2;
  while (await Team.exists({ slug: candidate })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

async function generateUniqueInviteCode(name: string): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateInviteCode(name);
    if (!(await Team.exists({ inviteCode: code }))) return code;
  }
  // Astronomically unlikely with an 8-attempt budget over a 32^4 keyspace,
  // but fail loudly rather than silently reuse a code if it ever happens.
  throw AppError.conflict('Could not allocate an invite code. Try again.');
}

export interface TeamMemberDto {
  userId: string;
  username: string;
  avatar: string | null;
  role: 'OWNER' | 'MEMBER';
  points: number;
  solvedCount: number;
  joinedAt: Date;
}

export interface TeamCategoryProgressDto {
  category: string;
  solved: number;
  total: number;
}

export interface TeamSummaryDto {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatar: string | null;
  points: number;
  solvedCount: number;
  memberCount: number;
  createdAt: Date;
  hidden: boolean;
}

export interface TeamDetailDto extends TeamSummaryDto {
  inviteCode: string | null; // only present for members of the team
  members: TeamMemberDto[];
  categoryProgress: TeamCategoryProgressDto[];
}

async function requireTeamByFilter(filter: Record<string, unknown>): Promise<TeamDoc> {
  const team = await Team.findOne(filter);
  if (!team) throw AppError.notFound('Team not found.');
  return team;
}

function requireOwner(team: TeamDoc, userId: string) {
  if (String(team.owner) !== userId) {
    throw AppError.forbidden('Only the team owner can do that.');
  }
}

/**
 * Team standings are never a stored, client- or even server-mutable
 * counter — they're computed live from each current member's own
 * (server-authoritative) points and solved-challenge set, the same way an
 * individual's rank is computed rather than stored. There is nothing to
 * race or desync because nothing is written here.
 */
async function computeMembersAndStats(team: TeamDoc): Promise<{
  members: TeamMemberDto[];
  points: number;
  categoryProgress: TeamCategoryProgressDto[];
}> {
  const memberIds = team.members.map((m) => m.user);
  const users = await User.find({ _id: { $in: memberIds } })
    .select('username avatar points solvedChallenges')
    .populate('solvedChallenges.challenge', 'category');

  const usersById = new Map(users.map((u) => [String(u._id), u]));
  const solvedByCategory: Record<string, Set<string>> = {};
  let points = 0;

  const members: TeamMemberDto[] = [];
  for (const m of team.members) {
    const u = usersById.get(String(m.user));
    if (!u) continue; // defensive — user deleted without a team-membership cleanup
    points += u.points;
    members.push({
      userId: String(u._id),
      username: u.username,
      avatar: u.avatar ?? null,
      role: m.role,
      points: u.points,
      solvedCount: u.solvedChallenges.length,
      joinedAt: m.joinedAt,
    });

    type PopulatedSolve = { challenge: { _id: unknown; category: string } | null };
    for (const sc of u.solvedChallenges as unknown as PopulatedSolve[]) {
      if (!sc.challenge) continue;
      const set = (solvedByCategory[sc.challenge.category] ??= new Set());
      set.add(String(sc.challenge._id));
    }
  }

  const totalsByCategory = await Challenge.aggregate<{ _id: string; total: number }>([
    { $match: { status: 'PUBLISHED' } },
    { $group: { _id: '$category', total: { $sum: 1 } } },
  ]);
  const totalsMap = new Map(totalsByCategory.map((t) => [t._id, t.total]));

  const categoryProgress: TeamCategoryProgressDto[] = CATEGORY_SLUGS.map((category) => ({
    category,
    solved: solvedByCategory[category]?.size ?? 0,
    total: totalsMap.get(category) ?? 0,
  }));

  members.sort((a, b) => b.points - a.points);
  return { members, points, categoryProgress };
}

function toSummary(team: TeamDoc, points: number, solvedCount: number): TeamSummaryDto {
  return {
    id: String(team._id),
    name: team.name,
    slug: team.slug,
    description: team.description,
    avatar: team.avatar ?? null,
    points,
    solvedCount,
    memberCount: team.members.length,
    createdAt: team.createdAt,
    hidden: team.hidden,
  };
}

async function toDetail(team: TeamDoc, viewerId: string | undefined): Promise<TeamDetailDto> {
  const { members, points, categoryProgress } = await computeMembersAndStats(team);
  const solvedCount = categoryProgress.reduce((sum, c) => sum + c.solved, 0);
  const isMember = !!viewerId && team.members.some((m) => String(m.user) === viewerId);
  return {
    ...toSummary(team, points, solvedCount),
    inviteCode: isMember ? team.inviteCode : null,
    members,
    categoryProgress,
  };
}

export async function createTeam(userId: string, input: CreateTeamInput): Promise<TeamDetailDto> {
  const requester = await User.findById(userId);
  if (!requester) throw AppError.notFound('User not found.');
  assertNotBanned(requester);
  if (requester.team) throw AppError.conflict('You are already on a team. Leave it before creating a new one.');

  const existingByName = await Team.findOne({ name: new RegExp(`^${input.name}$`, 'i') });
  if (existingByName) throw AppError.conflict('A team with that name already exists.');

  const slug = await generateUniqueSlug(input.name);
  const inviteCode = await generateUniqueInviteCode(input.name);

  const team = await Team.create({
    name: input.name,
    slug,
    description: input.description ?? '',
    avatar: input.avatar ?? null,
    owner: requester._id,
    members: [{ user: requester._id, role: 'OWNER', joinedAt: new Date() }],
    inviteCode,
  });

  requester.team = team._id;
  await requester.save();
  await awardTeamFounder(userId);

  return toDetail(team, userId);
}

export async function listTeams(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [teamDocs, total] = await Promise.all([
    Team.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Team.countDocuments(),
  ]);

  // A lighter-weight aggregation for the list view — sums stored member
  // points/solve counts directly rather than the richer (and pricier)
  // per-team category breakdown used on a single team's detail page.
  const ids = teamDocs.map((t) => t._id);
  const stats = await User.aggregate<{ _id: Types.ObjectId; points: number; solvedCount: number }>([
    { $match: { team: { $in: ids } } },
    { $group: { _id: '$team', points: { $sum: '$points' }, solvedCount: { $sum: { $size: '$solvedChallenges' } } } },
  ]);
  const statsByTeam = new Map(stats.map((s) => [String(s._id), s]));

  const teams = teamDocs
    .map((t) => {
      const s = statsByTeam.get(String(t._id));
      return toSummary(t, s?.points ?? 0, s?.solvedCount ?? 0);
    })
    .sort((a, b) => b.points - a.points);

  return { teams, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

export async function getTeamBySlug(slug: string, viewerId: string | undefined): Promise<TeamDetailDto> {
  const team = await requireTeamByFilter({ slug });
  return toDetail(team, viewerId);
}

export async function getMyTeam(userId: string): Promise<TeamDetailDto | null> {
  const team = await Team.findOne({ 'members.user': userId });
  if (!team) return null;
  return toDetail(team, userId);
}

export async function joinTeam(userId: string, inviteCode: string): Promise<TeamDetailDto> {
  const requester = await User.findById(userId);
  if (!requester) throw AppError.notFound('User not found.');
  assertNotBanned(requester);
  if (requester.team) throw AppError.conflict('You are already on a team. Leave it before joining another.');

  const team = await Team.findOne({ inviteCode: inviteCode.toUpperCase() });
  if (!team) throw AppError.notFound('Invalid invite code.');
  if (team.members.some((m) => String(m.user) === userId)) {
    throw AppError.conflict('You are already a member of this team.');
  }
  if (team.members.length >= MAX_TEAM_MEMBERS) {
    throw AppError.conflict(`This team is full (max ${MAX_TEAM_MEMBERS} members).`);
  }

  team.members.push({ user: requester._id, role: 'MEMBER', joinedAt: new Date() });
  await team.save();

  requester.team = team._id;
  await requester.save();

  return toDetail(team, userId);
}

export async function leaveTeam(userId: string): Promise<{ disbanded: boolean }> {
  const team = await Team.findOne({ 'members.user': userId });
  if (!team) throw AppError.notFound('You are not on a team.');

  const isOwner = String(team.owner) === userId;
  const leavingIndex = team.members.findIndex((m) => String(m.user) === userId);
  if (leavingIndex !== -1) team.members.splice(leavingIndex, 1);

  await User.updateOne({ _id: userId }, { $set: { team: null } });

  if (team.members.length === 0) {
    await Team.deleteOne({ _id: team._id });
    return { disbanded: true };
  }

  if (isOwner) {
    // Ownership passes to whoever joined earliest after the departing owner.
    const nextOwner = [...team.members].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())[0];
    nextOwner.role = 'OWNER';
    team.owner = nextOwner.user;
  }
  await team.save();

  return { disbanded: false };
}

export async function removeMember(requesterId: string, memberUserId: string): Promise<TeamDetailDto> {
  const team = await Team.findOne({ 'members.user': requesterId });
  if (!team) throw AppError.notFound('You are not on a team.');
  requireOwner(team, requesterId);
  if (memberUserId === requesterId) {
    throw AppError.validation('Use "leave team" to remove yourself.');
  }
  const index = team.members.findIndex((m) => String(m.user) === memberUserId);
  if (index === -1) throw AppError.notFound('That user is not a member of this team.');

  team.members.splice(index, 1);
  await team.save();
  await User.updateOne({ _id: memberUserId }, { $set: { team: null } });

  return toDetail(team, requesterId);
}

export async function transferOwnership(requesterId: string, newOwnerUserId: string): Promise<TeamDetailDto> {
  const team = await Team.findOne({ 'members.user': requesterId });
  if (!team) throw AppError.notFound('You are not on a team.');
  requireOwner(team, requesterId);

  const target = team.members.find((m) => String(m.user) === newOwnerUserId);
  if (!target) throw AppError.notFound('That user is not a member of this team.');

  const current = team.members.find((m) => String(m.user) === requesterId)!;
  current.role = 'MEMBER';
  target.role = 'OWNER';
  team.owner = target.user;
  await team.save();

  return toDetail(team, requesterId);
}

export async function updateTeam(requesterId: string, input: UpdateTeamInput): Promise<TeamDetailDto> {
  const team = await Team.findOne({ 'members.user': requesterId });
  if (!team) throw AppError.notFound('You are not on a team.');
  requireOwner(team, requesterId);

  if (input.description !== undefined) team.description = input.description;
  if (input.avatar !== undefined) team.avatar = input.avatar;
  await team.save();

  return toDetail(team, requesterId);
}

export async function regenerateInviteCode(requesterId: string): Promise<TeamDetailDto> {
  const team = await Team.findOne({ 'members.user': requesterId });
  if (!team) throw AppError.notFound('You are not on a team.');
  requireOwner(team, requesterId);

  team.inviteCode = await generateUniqueInviteCode(team.name);
  await team.save();

  return toDetail(team, requesterId);
}

export async function disbandTeam(requesterId: string): Promise<void> {
  const team = await Team.findOne({ 'members.user': requesterId });
  if (!team) throw AppError.notFound('You are not on a team.');
  requireOwner(team, requesterId);

  const memberIds = team.members.map((m) => m.user);
  await User.updateMany({ _id: { $in: memberIds } }, { $set: { team: null } });
  await Team.deleteOne({ _id: team._id });
}

export async function setTeamHidden(requesterId: string, teamId: string, hidden: boolean): Promise<TeamSummaryDto> {
  if (!Types.ObjectId.isValid(teamId)) throw AppError.notFound('Team not found.');

  const team = await Team.findById(teamId);
  if (!team) throw AppError.notFound('Team not found.');

  team.hidden = hidden;
  await team.save();

  await recordAudit(requesterId, 'ADMIN', hidden ? 'ADMIN_HID_TEAM' : 'ADMIN_UNHID_TEAM', 'team', teamId);

  const { points, categoryProgress } = await computeMembersAndStats(team);
  const solvedCount = categoryProgress.reduce((sum, c) => sum + c.solved, 0);
  return toSummary(team, points, solvedCount);
}
