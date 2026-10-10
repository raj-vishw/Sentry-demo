import { Types } from 'mongoose';
import { User } from '../models/User.js';
import { Submission } from '../models/Submission.js';
import { Team } from '../models/Team.js';
import { getCompetitionConfig } from './competitionConfig.service.js';

export type LeaderboardScope = 'global' | 'weekly' | 'monthly';

export interface LeaderboardEntryDto {
  rank: number;
  userId: string;
  username: string;
  avatar: string | null;
  points: number;
  solvedCount: number;
  teamName: string | null;
}

export interface LeaderboardResult {
  entries: LeaderboardEntryDto[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  me: (LeaderboardEntryDto & { onPage: boolean }) | null;
  frozen: boolean;
  freezeTime: Date | null;
}

/**
 * Display-only freeze: once `freezeTime` has passed, a non-admin viewer's
 * *global* leaderboard is computed as of that instant instead of live.
 * Scoring is never touched by this — a solve after freezeTime still counts
 * normally, it just doesn't move the frozen display. Only the `global`
 * scope is affected; freezing a rolling weekly/monthly window isn't a
 * coherent concept the same way freezing lifetime standings is.
 */
export async function isFrozen(): Promise<{ frozen: boolean; freezeTime: Date | null }> {
  const { freezeTime } = await getCompetitionConfig();
  return { frozen: !!freezeTime && freezeTime.getTime() <= Date.now(), freezeTime };
}

/**
 * Appends aggregation stages that assign a sequential `rank` (1, 2, 3, ...)
 * following a multi-field sort. MongoDB's native rank operators ($rank,
 * $denseRank, $documentNumber) only accept a single-field `sortBy`, which
 * can't express "points desc, then earlier account/solve as the
 * tiebreaker" in one expression — so instead: sort fully, collapse the
 * whole ordered set into one array, then re-expand it with its array index
 * as the rank. Assumes a leaderboard-sized result set (hundreds—low
 * thousands of rows), not an unbounded one — reasonable for this platform.
 */
function withSequentialRank(sortBy: Record<string, 1 | -1>) {
  return [
    { $sort: sortBy },
    { $group: { _id: null, docs: { $push: '$$ROOT' } } },
    { $unwind: { path: '$docs', includeArrayIndex: 'rankIndex' } },
    { $replaceRoot: { newRoot: { $mergeObjects: ['$docs', { rank: { $add: ['$rankIndex', 1] } }] } } },
  ];
}

function scopeStart(scope: LeaderboardScope): Date | null {
  if (scope === 'global') return null;
  const now = new Date();
  const days = scope === 'weekly' ? 7 : 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * Ranked entries for a scope: points desc, ties broken by earlier
 * createdAt (account creation for global, first solve in the window for
 * weekly/monthly). Built as one aggregation so the database does the
 * ranking across the *entire* matching set before anything is paginated,
 * so "my rank" is always correct even off-page, without a second scan.
 */
async function rankedByWindow(
  isAdmin: boolean,
  window: { $gte: Date } | { $lte: Date },
): Promise<{ userId: Types.ObjectId; points: number; solvedCount: number; rank: number; createdAt: Date }[]> {
  const hiddenUserIds = isAdmin ? [] : await User.find({ hidden: true }).select('_id').lean();
  return Submission.aggregate([
    {
      $match: {
        correct: true,
        createdAt: window,
        ...(isAdmin ? {} : { user: { $nin: hiddenUserIds.map((u) => u._id) } }),
      },
    },
    {
      $group: {
        _id: '$user',
        points: { $sum: '$pointsAwarded' },
        solvedCount: { $sum: 1 },
        createdAt: { $min: '$createdAt' },
      },
    },
    ...withSequentialRank({ points: -1, createdAt: 1 }),
    { $project: { userId: '$_id', points: 1, solvedCount: 1, rank: 1, createdAt: 1, _id: 0 } },
  ]);
}

async function rankedEntries(scope: LeaderboardScope, isAdmin: boolean, frozenAt: Date | null): Promise<
  { userId: Types.ObjectId; points: number; solvedCount: number; rank: number; createdAt: Date }[]
> {
  const since = scopeStart(scope);

  if (!since) {
    if (frozenAt && !isAdmin) {
      // Frozen: rank by points earned up to the freeze instant, from the
      // submission log (structurally the same shape as the weekly/monthly
      // branch below, just an upper bound instead of a lower one) — the
      // live User.points field has no historical snapshot capability.
      return rankedByWindow(isAdmin, { $lte: frozenAt });
    }
    return User.aggregate([
      ...(isAdmin ? [] : [{ $match: { hidden: { $ne: true } } }]),
      {
        $project: {
          points: 1,
          createdAt: 1,
          solvedCount: { $size: '$solvedChallenges' },
        },
      },
      ...withSequentialRank({ points: -1, createdAt: 1 }),
      { $project: { userId: '$_id', points: 1, solvedCount: 1, rank: 1, createdAt: 1, _id: 0 } },
    ]);
  }

  // Weekly/monthly: rank by points *earned in the window*, from the
  // submission log — the User.points field is lifetime-total and not
  // useful for a time-boxed scope. Never frozen — see isFrozen()'s doc
  // comment for why a rolling window isn't a coherent thing to freeze.
  return rankedByWindow(isAdmin, { $gte: since });
}

async function hydrate(rows: { userId: Types.ObjectId; points: number; solvedCount: number; rank: number }[]) {
  const users = await User.find({ _id: { $in: rows.map((r) => r.userId) } })
    .select('username avatar team')
    .populate('team', 'name');
  const byId = new Map(users.map((u) => [String(u._id), u]));

  return rows
    .map((r): LeaderboardEntryDto | null => {
      const u = byId.get(String(r.userId));
      if (!u) return null;
      const team = u.team as unknown as { name: string } | null;
      return {
        rank: r.rank,
        userId: String(r.userId),
        username: u.username,
        avatar: u.avatar ?? null,
        points: r.points,
        solvedCount: r.solvedCount,
        teamName: team?.name ?? null,
      };
    })
    .filter((e): e is LeaderboardEntryDto => e !== null);
}

export async function getLeaderboard(
  scope: LeaderboardScope,
  page: number,
  limit: number,
  viewerId: string | undefined,
  isAdmin = false,
): Promise<LeaderboardResult> {
  const freeze = scope === 'global' && !isAdmin ? await isFrozen() : { frozen: false, freezeTime: null };
  const ranked = await rankedEntries(scope, isAdmin, freeze.frozen ? freeze.freezeTime : null);
  const total = ranked.length;
  const skip = (page - 1) * limit;
  const pageRows = ranked.slice(skip, skip + limit);

  const viewerRow = viewerId ? ranked.find((r) => String(r.userId) === viewerId) : undefined;
  const onPage = !!viewerRow && pageRows.includes(viewerRow);

  const toHydrate = [...pageRows];
  if (viewerRow && !onPage) toHydrate.push(viewerRow);
  const hydrated = await hydrate(toHydrate);
  const byUserId = new Map(hydrated.map((e) => [e.userId, e]));

  const entries = pageRows.map((r) => byUserId.get(String(r.userId))).filter((e): e is LeaderboardEntryDto => !!e);
  const meEntry = viewerRow ? byUserId.get(String(viewerRow.userId)) : undefined;

  return {
    entries,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    me: meEntry ? { ...meEntry, onPage } : null,
    frozen: freeze.frozen,
    freezeTime: freeze.freezeTime,
  };
}

export interface TeamLeaderboardEntryDto {
  rank: number;
  teamId: string;
  name: string;
  slug: string;
  avatar: string | null;
  points: number;
  solvedCount: number;
  memberCount: number;
}

/**
 * Frozen team standings. A Submission only records who solved what, not
 * which team they were on at the time — this attributes every solve to
 * the solver's CURRENT team, not their team-at-solve-time. A player who
 * changes teams after the freeze (or even after their own solve, before
 * the freeze) shows their points on their new team's frozen total, not
 * their old one. KNOWN LIMITATION, not solved here — fixing it would mean
 * recording team-at-submit-time on every Submission, out of scope for a
 * display-only freeze feature. `memberCount` is similarly a frozen-view
 * approximation: it counts members with at least one counted solve by
 * freezeTime, not the team's actual current roster size.
 */
async function frozenTeamRanking(freezeTime: Date, hiddenTeamIds: Types.ObjectId[]): Promise<
  { teamId: Types.ObjectId; points: number; solvedCount: number; memberCount: number; rank: number }[]
> {
  return Submission.aggregate([
    { $match: { correct: true, createdAt: { $lte: freezeTime } } },
    { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'userDoc' } },
    { $unwind: '$userDoc' },
    { $match: { 'userDoc.team': { $ne: null, $nin: hiddenTeamIds } } },
    {
      $group: {
        _id: '$userDoc.team',
        points: { $sum: '$pointsAwarded' },
        solvedCount: { $sum: 1 },
        members: { $addToSet: '$userDoc._id' },
      },
    },
    { $project: { points: 1, solvedCount: 1, memberCount: { $size: '$members' } } },
    ...withSequentialRank({ points: -1, _id: 1 }),
    { $project: { teamId: '$_id', points: 1, solvedCount: 1, memberCount: 1, rank: 1, _id: 0 } },
  ]);
}

export async function getTeamLeaderboard(page: number, limit: number, isAdmin = false) {
  const hiddenTeamIds = isAdmin ? [] : (await Team.find({ hidden: true }).select('_id').lean()).map((t) => t._id);
  const freeze = isAdmin ? { frozen: false, freezeTime: null } : await isFrozen();

  const ranked: { teamId: Types.ObjectId; points: number; solvedCount: number; memberCount: number; rank: number }[] =
    freeze.frozen && freeze.freezeTime
      ? await frozenTeamRanking(freeze.freezeTime, hiddenTeamIds)
      : await User.aggregate([
          { $match: { team: { $ne: null, $nin: hiddenTeamIds } } },
          {
            $group: {
              _id: '$team',
              points: { $sum: '$points' },
              solvedCount: { $sum: { $size: '$solvedChallenges' } },
              memberCount: { $sum: 1 },
            },
          },
          ...withSequentialRank({ points: -1, _id: 1 }),
          { $project: { teamId: '$_id', points: 1, solvedCount: 1, memberCount: 1, rank: 1, _id: 0 } },
        ]);

  const total = ranked.length;
  const skip = (page - 1) * limit;
  const pageRows = ranked.slice(skip, skip + limit);

  const teams = await Team.find({ _id: { $in: pageRows.map((r) => r.teamId) } }).select('name slug avatar');
  const teamsById = new Map(teams.map((t) => [String(t._id), t]));

  const entries: TeamLeaderboardEntryDto[] = pageRows
    .map((r) => {
      const t = teamsById.get(String(r.teamId));
      if (!t) return null;
      return {
        rank: r.rank,
        teamId: String(r.teamId),
        name: t.name,
        slug: t.slug,
        avatar: t.avatar ?? null,
        points: r.points,
        solvedCount: r.solvedCount,
        memberCount: r.memberCount,
      };
    })
    .filter((e): e is TeamLeaderboardEntryDto => e !== null);

  return {
    entries,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    frozen: freeze.frozen,
    freezeTime: freeze.freezeTime,
  };
}
