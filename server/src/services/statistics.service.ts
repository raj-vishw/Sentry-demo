import { Types } from 'mongoose';
import { User } from '../models/User.js';
import { Challenge } from '../models/Challenge.js';
import { Submission } from '../models/Submission.js';
import { Team } from '../models/Team.js';
import { Writeup } from '../models/Writeup.js';
import type { StatsRange } from '../validators/statistics.schema.js';

const RANGE_HOURS: Record<Exclude<StatsRange, 'all'>, number> = {
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
  '90d': 24 * 90,
};

function rangeStart(range: StatsRange): Date | null {
  if (range === 'all') return null;
  return new Date(Date.now() - RANGE_HOURS[range] * 60 * 60 * 1000);
}

function dailyBucket(since: Date | null) {
  return [
    ...(since ? [{ $match: { createdAt: { $gte: since } } }] : []),
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 as const } },
    { $project: { date: '$_id', count: 1, _id: 0 } },
  ];
}

export async function getOverview() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [
    totalUsers,
    activeUsers,
    totalChallenges,
    publishedChallenges,
    totalTeams,
    totalSubmissions,
    successfulSubmissions,
    publishedWriteups,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ lastLoginAt: { $gte: sevenDaysAgo } }),
    Challenge.countDocuments(),
    Challenge.countDocuments({ status: 'PUBLISHED' }),
    Team.countDocuments(),
    Submission.countDocuments(),
    Submission.countDocuments({ correct: true }),
    Writeup.countDocuments({ status: 'PUBLISHED' }),
  ]);

  return {
    totalUsers,
    activeUsers,
    totalChallenges,
    publishedChallenges,
    totalTeams,
    totalSubmissions,
    successfulSubmissions,
    totalSolves: successfulSubmissions,
    publishedWriteups,
  };
}

export async function getUserStats(range: StatsRange) {
  const since = rangeStart(range);
  const createdFilter = since ? { createdAt: { $gte: since } } : {};
  const activeFilter = since ? { lastLoginAt: { $gte: since } } : { lastLoginAt: { $ne: null } };

  const [newUsers, activeUsers, registrationsOverTime] = await Promise.all([
    User.countDocuments(createdFilter),
    User.countDocuments(activeFilter),
    User.aggregate(dailyBucket(since)),
  ]);

  return { range, newUsers, activeUsers, registrationsOverTime };
}

export async function getChallengeStats(range: StatsRange) {
  const since = rangeStart(range);

  const [totalChallenges, published, unsolvedChallenges, categoryAgg, difficultyAgg, solvesInRange] = await Promise.all([
    Challenge.countDocuments(),
    Challenge.countDocuments({ status: 'PUBLISHED' }),
    Challenge.countDocuments({ solves: 0 }),
    Challenge.aggregate<{ _id: string; challengeCount: number; solveCount: number }>([
      { $group: { _id: '$category', challengeCount: { $sum: 1 }, solveCount: { $sum: '$solves' } } },
    ]),
    Challenge.aggregate<{ _id: string; challengeCount: number; solveCount: number }>([
      { $group: { _id: '$difficulty', challengeCount: { $sum: 1 }, solveCount: { $sum: '$solves' } } },
    ]),
    since
      ? Submission.countDocuments({ correct: true, createdAt: { $gte: since } })
      : Submission.countDocuments({ correct: true }),
  ]);

  const totalSolves = categoryAgg.reduce((sum, c) => sum + c.solveCount, 0);

  return {
    range,
    totalChallenges,
    published,
    draft: totalChallenges - published,
    unsolvedChallenges,
    totalSolves,
    averageSolves: totalChallenges > 0 ? totalSolves / totalChallenges : 0,
    solvesInRange,
    categoryDistribution: categoryAgg.map((c) => ({ category: c._id, challengeCount: c.challengeCount, solveCount: c.solveCount })),
    difficultyDistribution: difficultyAgg.map((d) => ({ difficulty: d._id, challengeCount: d.challengeCount, solveCount: d.solveCount })),
  };
}

export async function getSubmissionStats(range: StatsRange) {
  const since = rangeStart(range);
  const filter = since ? { createdAt: { $gte: since } } : {};

  const [total, correct, topAttemptedRaw] = await Promise.all([
    Submission.countDocuments(filter),
    Submission.countDocuments({ ...filter, correct: true }),
    Submission.aggregate<{ _id: Types.ObjectId; attempts: number; successes: number }>([
      ...(since ? [{ $match: { createdAt: { $gte: since } } }] : []),
      { $group: { _id: '$challenge', attempts: { $sum: 1 }, successes: { $sum: { $cond: ['$correct', 1, 0] } } } },
      { $sort: { attempts: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const challenges = await Challenge.find({ _id: { $in: topAttemptedRaw.map((r) => r._id) } }).select('title');
  const titleById = new Map(challenges.map((c) => [String(c._id), c.title]));

  return {
    range,
    total,
    correct,
    incorrect: total - correct,
    successRate: total > 0 ? (correct / total) * 100 : 0,
    topAttempted: topAttemptedRaw.map((r) => ({
      challengeId: String(r._id),
      title: titleById.get(String(r._id)) ?? 'Unknown challenge',
      attempts: r.attempts,
      successes: r.successes,
      successRate: r.attempts > 0 ? (r.successes / r.attempts) * 100 : 0,
    })),
  };
}

export async function getTeamStats(range: StatsRange) {
  const since = rangeStart(range);

  const [totalTeams, sizeAgg, pointsAgg] = await Promise.all([
    Team.countDocuments(),
    Team.aggregate<{ avg: number }>([
      { $project: { size: { $size: '$members' } } },
      { $group: { _id: null, avg: { $avg: '$size' } } },
    ]),
    User.aggregate<{ totalPoints: number; totalSolves: number }>([
      { $match: { team: { $ne: null } } },
      { $group: { _id: null, totalPoints: { $sum: '$points' }, totalSolves: { $sum: { $size: '$solvedChallenges' } } } },
    ]),
  ]);

  const activeSubmitters = await Submission.aggregate<{ _id: Types.ObjectId }>([
    { $match: { correct: true, ...(since ? { createdAt: { $gte: since } } : {}) } },
    { $group: { _id: '$user' } },
  ]);
  const activeTeamIds = await User.distinct('team', {
    _id: { $in: activeSubmitters.map((s) => s._id) },
    team: { $ne: null },
  });

  return {
    range,
    totalTeams,
    activeTeams: activeTeamIds.length,
    averageTeamSize: sizeAgg[0]?.avg ?? 0,
    totalTeamPoints: pointsAgg[0]?.totalPoints ?? 0,
    totalTeamSolves: pointsAgg[0]?.totalSolves ?? 0,
  };
}

export async function getWriteupStats(range: StatsRange) {
  const since = rangeStart(range);
  const filter = since ? { createdAt: { $gte: since } } : {};

  const [total, published, pending, rejected, viewsAgg, topViewed] = await Promise.all([
    Writeup.countDocuments(filter),
    Writeup.countDocuments({ ...filter, status: 'PUBLISHED' }),
    Writeup.countDocuments({ ...filter, status: 'PENDING_REVIEW' }),
    Writeup.countDocuments({ ...filter, status: 'REJECTED' }),
    Writeup.aggregate<{ totalViews: number; totalLikes: number }>([
      { $match: { status: 'PUBLISHED' } },
      { $group: { _id: null, totalViews: { $sum: '$views' }, totalLikes: { $sum: '$likesCount' } } },
    ]),
    Writeup.find({ status: 'PUBLISHED' }).sort({ views: -1 }).limit(5).select('title slug views likesCount'),
  ]);

  return {
    range,
    total,
    published,
    pending,
    rejected,
    totalViews: viewsAgg[0]?.totalViews ?? 0,
    totalLikes: viewsAgg[0]?.totalLikes ?? 0,
    topViewed: topViewed.map((w) => ({ id: w.id, title: w.title, slug: w.slug, views: w.views, likesCount: w.likesCount })),
  };
}
