import { Achievement } from '../models/Achievement.js';
import { User } from '../models/User.js';
import { Challenge } from '../models/Challenge.js';
import type { CategorySlug } from '../models/Category.js';
import { computeStreak } from './user.service.js';

const DUPLICATE_KEY_ERROR = 11000;

export interface AwardedAchievementDto {
  type: string;
  awardedAt: Date;
}

/**
 * Attempts to award one achievement. Relies entirely on the {user,type}
 * unique index for "already earned" rather than a pre-check — same
 * create-then-catch-duplicate-key pattern already used for solve
 * uniqueness in submission.service.ts, so this is safe to call
 * unconditionally every time its trigger condition is met, not just the
 * first time.
 */
async function tryAward(userId: string, type: string): Promise<AwardedAchievementDto | null> {
  try {
    const doc = await Achievement.create({ user: userId, type });
    return { type, awardedAt: doc.createdAt };
  } catch (err) {
    const mongoErr = err as { code?: number };
    if (mongoErr.code === DUPLICATE_KEY_ERROR) return null;
    throw err;
  }
}

/**
 * Re-evaluates every solve-driven achievement after a correct solve. Cheap
 * to call unconditionally on every solve — each check is one indexed
 * query/count, and re-awarding something already earned is a no-op.
 *
 * `isFirstBlood` is read from the challenge's solve count as it stood when
 * the request started (not re-checked atomically) — this is a cosmetic
 * badge, not a scoring input, so the astronomically rare case of two truly
 * simultaneous first solves both earning it is an acceptable trade-off
 * against the complexity of a fully atomic check. Actual scoring integrity
 * (no duplicate points) is unaffected either way — that's guaranteed
 * separately by Submission's unique solve index.
 */
export async function evaluateAfterSolve(
  userId: string,
  opts: { isFirstBlood: boolean; category: CategorySlug },
): Promise<AwardedAchievementDto[]> {
  const user = await User.findById(userId)
    .select('solvedChallenges')
    .populate<{ solvedChallenges: { challenge: { category: CategorySlug } | null; solvedAt: Date }[] }>(
      'solvedChallenges.challenge',
      'category',
    );
  if (!user) return [];

  const solves = user.solvedChallenges;
  const solveCount = solves.length;
  const checks: Promise<AwardedAchievementDto | null>[] = [];

  if (solveCount === 1) checks.push(tryAward(userId, 'FIRST_SOLVE'));
  if (solveCount >= 10) checks.push(tryAward(userId, 'SOLVE_COUNT_10'));
  if (solveCount >= 25) checks.push(tryAward(userId, 'SOLVE_COUNT_25'));
  if (solveCount >= 50) checks.push(tryAward(userId, 'SOLVE_COUNT_50'));

  const streak = computeStreak(solves.map((s) => s.solvedAt));
  if (streak >= 7) checks.push(tryAward(userId, 'STREAK_7'));
  if (streak >= 30) checks.push(tryAward(userId, 'STREAK_30'));

  if (opts.isFirstBlood) checks.push(tryAward(userId, 'FIRST_BLOOD'));

  const solvedInCategory = solves.filter((s) => s.challenge?.category === opts.category).length;
  const totalInCategory = await Challenge.countDocuments({ category: opts.category, status: 'PUBLISHED' });
  if (totalInCategory > 0 && solvedInCategory >= totalInCategory) {
    checks.push(tryAward(userId, `CATEGORY_MASTER_${opts.category}`));
  }

  const results = await Promise.all(checks);
  return results.filter((a): a is AwardedAchievementDto => a !== null);
}

export async function awardFirstWriteupPublished(userId: string): Promise<AwardedAchievementDto | null> {
  return tryAward(userId, 'FIRST_WRITEUP_PUBLISHED');
}

export async function awardTeamFounder(userId: string): Promise<AwardedAchievementDto | null> {
  return tryAward(userId, 'TEAM_FOUNDER');
}

export interface AchievementDto {
  type: string;
  awardedAt: Date;
}

export async function listForUser(userId: string): Promise<AchievementDto[]> {
  const docs = await Achievement.find({ user: userId }).sort({ createdAt: 1 });
  return docs.map((d) => ({ type: d.type, awardedAt: d.createdAt }));
}
