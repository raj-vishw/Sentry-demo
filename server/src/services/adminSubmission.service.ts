import { Types } from 'mongoose';
import { Submission, type SubmissionDoc } from '../models/Submission.js';
import { Challenge } from '../models/Challenge.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';
import { toCsv } from '../utils/csv.js';
import { record as recordAudit } from './auditLog.service.js';
import type { ListAdminSubmissionsQuery, ExportSubmissionsQuery } from '../validators/adminSubmission.schema.js';

export interface AdminSubmissionDto {
  id: string;
  username: string;
  challengeId: string;
  challengeTitle: string;
  category: string;
  correct: boolean;
  pointsAwarded: number;
  ip: string | null;
  createdAt: Date;
  // Descriptive only, never an accusation — see spec "Anomaly Visibility":
  // flags a user with an unusually high submission burst around this entry.
  flaggedForReview: boolean;
}

type PopulatedSubmission = SubmissionDoc & { user: unknown; challenge: unknown };

// A user submitting this many times inside the window counts as a burst
// worth a human look — purely descriptive, never auto-actioned.
const BURST_WINDOW_MS = 5 * 60 * 1000;
const BURST_THRESHOLD = 8;

export async function listSubmissions(opts: ListAdminSubmissionsQuery) {
  const filter: Record<string, unknown> = {};
  if (opts.result) filter.correct = opts.result === 'correct';
  if (opts.startDate || opts.endDate) {
    filter.createdAt = {
      ...(opts.startDate ? { $gte: opts.startDate } : {}),
      ...(opts.endDate ? { $lte: opts.endDate } : {}),
    };
  }
  if (opts.category) {
    const categoryChallenges = await Challenge.find({ category: opts.category }).select('_id');
    const categoryIds = categoryChallenges.map((c) => String(c._id));
    // Intersect with an explicit challengeId filter if both are given,
    // rather than letting one silently overwrite the other.
    filter.challenge = {
      $in: opts.challengeId ? categoryIds.filter((id) => id === opts.challengeId) : categoryIds,
    };
  } else if (opts.challengeId && Types.ObjectId.isValid(opts.challengeId)) {
    filter.challenge = opts.challengeId;
  }
  if (opts.username) {
    const escaped = opts.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await User.find({ username: new RegExp(escaped, 'i') }).select('_id');
    filter.user = { $in: users.map((u) => u._id) };
  }

  const skip = (opts.page - 1) * opts.limit;
  const [docs, total] = await Promise.all([
    Submission.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(opts.limit)
      .populate('user', 'username')
      .populate('challenge', 'title category'),
    Submission.countDocuments(filter),
  ]);

  // Burst detection runs over just the users present on this page — cheap,
  // and good enough for a descriptive operational signal rather than a
  // platform-wide abuse detector (explicitly out of scope, see README).
  // `user` is already populated above, so pull `._id` off it rather than
  // `String()`-coercing the populated subdocument directly (that stringifies
  // the whole object, not the id — the same trap fixed in report.service.ts).
  const userIds = [
    ...new Set(
      docs.map((d) => {
        const user = (d as unknown as PopulatedSubmission).user as unknown as { _id: unknown };
        return String(user._id);
      }),
    ),
  ];
  const burstCounts = await Submission.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { user: { $in: userIds.map((id) => new Types.ObjectId(id)) }, createdAt: { $gte: new Date(Date.now() - BURST_WINDOW_MS) } } },
    { $group: { _id: '$user', count: { $sum: 1 } } },
  ]);
  const flaggedUserIds = new Set(burstCounts.filter((b) => b.count >= BURST_THRESHOLD).map((b) => String(b._id)));

  const submissions: AdminSubmissionDto[] = docs.map((doc) => {
    const d = doc as unknown as PopulatedSubmission;
    const user = d.user as unknown as { _id: unknown; username: string };
    const challenge = d.challenge as unknown as { _id: unknown; title: string; category: string };
    return {
      id: doc.id,
      username: user.username,
      challengeId: String(challenge._id),
      challengeTitle: challenge.title,
      category: challenge.category,
      correct: doc.correct,
      pointsAwarded: doc.pointsAwarded,
      ip: doc.ip ?? null,
      createdAt: doc.createdAt,
      flaggedForReview: flaggedUserIds.has(String(user._id)),
    };
  });

  return {
    submissions,
    pagination: { page: opts.page, limit: opts.limit, total, totalPages: Math.max(1, Math.ceil(total / opts.limit)) },
  };
}

// Bounds memory for an unpaginated export — generous for anything this
// platform's scale would realistically produce.
const EXPORT_ROW_CAP = 10_000;

export async function exportSubmissionsCsv(opts: ExportSubmissionsQuery): Promise<string> {
  const { submissions } = await listSubmissions({ ...opts, page: 1, limit: EXPORT_ROW_CAP });
  const header = ['id', 'username', 'challengeTitle', 'category', 'correct', 'pointsAwarded', 'ip', 'createdAt'];
  const rows = submissions.map((s) => [
    s.id,
    s.username,
    s.challengeTitle,
    s.category,
    String(s.correct),
    String(s.pointsAwarded),
    s.ip ?? '',
    s.createdAt.toISOString(),
  ]);
  return toCsv(header, rows);
}

/**
 * Reverses a correct submission — flips it to incorrect, decrements the
 * challenge's solve count, removes the matching solvedChallenges entry and
 * reverses the points it awarded. Safe to do this way (rather than needing
 * a cached-value reconciliation step) precisely because team/leaderboard
 * standings and rank are already computed live from these same fields
 * everywhere else in this codebase — never cached.
 *
 * Deliberately does NOT attempt to revoke any achievement that may have
 * been earned off this solve (e.g. FIRST_SOLVE, a solve-count milestone) —
 * achievements are a lifetime record, not recomputed retroactively; see
 * achievement.service.ts. This only fixes points/solve-count/leaderboard
 * integrity, which is the actual trust problem this feature exists for.
 */
export async function invalidateSubmission(adminId: string, submissionId: string): Promise<void> {
  if (!Types.ObjectId.isValid(submissionId)) throw AppError.notFound('Submission not found.');
  const submission = await Submission.findById(submissionId);
  if (!submission) throw AppError.notFound('Submission not found.');
  if (!submission.correct) {
    throw AppError.conflict('This submission is already marked incorrect.');
  }

  const pointsToReverse = submission.pointsAwarded;
  submission.correct = false;
  submission.pointsAwarded = 0;
  await submission.save();

  await Promise.all([
    Challenge.updateOne({ _id: submission.challenge }, { $inc: { solves: -1 } }),
    User.updateOne(
      { _id: submission.user },
      {
        $inc: { points: -pointsToReverse },
        $pull: { solvedChallenges: { challenge: submission.challenge } },
      },
    ),
  ]);

  await recordAudit(adminId, 'ADMIN', 'ADMIN_INVALIDATED_SUBMISSION', 'submission', submissionId, {
    challengeId: String(submission.challenge),
    userId: String(submission.user),
    pointsReversed: pointsToReverse,
  });
}
