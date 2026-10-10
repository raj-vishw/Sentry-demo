import { Types } from 'mongoose';
import { Challenge } from '../models/Challenge.js';
import { AppError } from '../utils/errors.js';
import { record as recordAudit } from './auditLog.service.js';
import { challengeRuntime } from './runtime/NotImplementedRuntime.js';
import type { ChallengeInstanceDto } from './runtime/ChallengeRuntime.js';

export async function createInstance(userId: string, challengeId: string): Promise<ChallengeInstanceDto> {
  if (!Types.ObjectId.isValid(challengeId)) throw AppError.notFound('Challenge not found.');
  const challenge = await Challenge.findById(challengeId).select('type status');
  if (!challenge || challenge.status !== 'PUBLISHED') throw AppError.notFound('Challenge not found.');
  if (challenge.type === 'STATIC') {
    throw AppError.validation('This challenge does not have an interactive environment.');
  }

  const instance = await challengeRuntime.createInstance(challengeId, userId);
  await recordAudit(userId, 'USER', 'INSTANCE_CREATED', 'challenge_instance', instance.id, { challengeId });
  return instance;
}

/**
 * A mismatch is reported identically to "doesn't exist" (404, not 403) —
 * whether another user's instance even exists is not disclosed.
 */
async function getOwnedInstance(userId: string, instanceId: string): Promise<ChallengeInstanceDto> {
  if (!Types.ObjectId.isValid(instanceId)) throw AppError.notFound('Instance not found.');
  const instance = await challengeRuntime.getInstance(instanceId);
  if (instance.userId !== userId) throw AppError.notFound('Instance not found.');
  return instance;
}

export async function getInstance(userId: string, instanceId: string): Promise<ChallengeInstanceDto> {
  return getOwnedInstance(userId, instanceId);
}

export async function stopInstance(userId: string, instanceId: string): Promise<void> {
  await getOwnedInstance(userId, instanceId);
  await recordAudit(userId, 'USER', 'INSTANCE_STOP_REQUESTED', 'challenge_instance', instanceId);
  await challengeRuntime.stopInstance(instanceId);
}

export async function restartInstance(userId: string, instanceId: string): Promise<void> {
  await getOwnedInstance(userId, instanceId);
  await challengeRuntime.restartInstance(instanceId);
}
