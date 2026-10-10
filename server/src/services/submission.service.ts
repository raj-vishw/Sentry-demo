import { Types } from 'mongoose';
import { Challenge } from '../models/Challenge.js';
import { Submission } from '../models/Submission.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';
import { compareFlag, digestSubmittedFlag } from '../utils/flag.js';
import { evaluateAfterSolve, type AwardedAchievementDto } from './achievement.service.js';
import { assertNotBanned } from './userStatus.service.js';

export interface SubmitFlagResult {
  correct: boolean;
  alreadySolved: boolean;
  pointsAwarded: number;
  message: string;
  newAchievements: AwardedAchievementDto[];
}

const DUPLICATE_KEY_ERROR = 11000;

export async function submitFlag(
  userId: string,
  challengeId: string,
  flagPlain: string,
  ip: string | undefined,
): Promise<SubmitFlagResult> {
  const submitter = await User.findById(userId).select('status');
  if (!submitter) throw AppError.unauthorized();
  assertNotBanned(submitter);

  if (!Types.ObjectId.isValid(challengeId)) {
    throw AppError.notFound('Challenge not found.');
  }

  const challenge = await Challenge.findOne({ _id: challengeId, status: 'PUBLISHED' }).select('+flagHash');
  if (!challenge) {
    throw AppError.notFound('Challenge not found.');
  }

  const correct = await compareFlag(flagPlain, challenge.flagHash);
  const submittedFlagHash = digestSubmittedFlag(flagPlain);

  if (!correct) {
    await Submission.create({
      user: userId,
      challenge: challenge._id,
      submittedFlagHash,
      correct: false,
      pointsAwarded: 0,
      ip: ip ?? null,
    });
    // Deliberately generic — never hints at which part of the flag was
    // wrong, which would help an attacker brute-force it incrementally.
    return { correct: false, alreadySolved: false, pointsAwarded: 0, message: 'Incorrect flag.', newAchievements: [] };
  }

  // Read before any mutation below — reflects the solve count as this
  // request found it, which is what "isFirstBlood" is evaluated against.
  // See achievement.service.ts#evaluateAfterSolve for why this doesn't
  // need to be fully atomic (it's a cosmetic badge, not a scoring input).
  const isFirstBlood = challenge.solves === 0;

  try {
    await Submission.create({
      user: userId,
      challenge: challenge._id,
      submittedFlagHash,
      correct: true,
      pointsAwarded: challenge.points,
      ip: ip ?? null,
    });
  } catch (err) {
    const mongoErr = err as { code?: number };
    if (mongoErr.code === DUPLICATE_KEY_ERROR) {
      // The unique partial index on {user, challenge, correct: true} is
      // what actually guarantees no duplicate solve, even if two correct
      // submissions from the same user race each other.
      return {
        correct: true,
        alreadySolved: true,
        pointsAwarded: 0,
        message: 'Already solved — no additional points awarded.',
        newAchievements: [],
      };
    }
    throw err;
  }

  await Promise.all([
    Challenge.updateOne({ _id: challenge._id }, { $inc: { solves: 1 } }),
    User.updateOne(
      { _id: userId },
      {
        $inc: { points: challenge.points },
        $push: {
          solvedChallenges: { challenge: challenge._id, points: challenge.points, solvedAt: new Date() },
        },
      },
    ),
  ]);

  const newAchievements = await evaluateAfterSolve(userId, { isFirstBlood, category: challenge.category });

  return {
    correct: true,
    alreadySolved: false,
    pointsAwarded: challenge.points,
    message: 'Challenge solved.',
    newAchievements,
  };
}
