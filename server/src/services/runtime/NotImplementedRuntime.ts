import { ChallengeInstance, type ChallengeInstanceDoc } from '../../models/ChallengeInstance.js';
import { AppError } from '../../utils/errors.js';
import type { ChallengeRuntime, ChallengeInstanceDto } from './ChallengeRuntime.js';

const NOT_IMPLEMENTED_MESSAGE = 'Interactive challenge execution is not available on this deployment yet.';

function toDto(doc: ChallengeInstanceDoc): ChallengeInstanceDto {
  return {
    id: doc.id,
    challengeId: String(doc.challenge),
    userId: String(doc.user),
    status: doc.status,
    endpoint: doc.endpoint ?? null,
    failureReason: doc.failureReason ?? null,
    createdAt: doc.createdAt,
    expiresAt: doc.expiresAt ?? null,
  };
}

/**
 * The only `ChallengeRuntime` this phase ships. It does not simulate
 * working — `createInstance` genuinely writes a `ChallengeInstance` row
 * (so ownership, authorization, and the data model above it are fully
 * real and testable) but immediately marks it FAILED with a clear reason,
 * rather than pretending to start a container that was never built. This
 * is the deliberate, honest landing point for a real implementation
 * (LocalDockerRuntime, etc.) later — see docs/architecture/challenge-runtime.md.
 */
export class NotImplementedRuntime implements ChallengeRuntime {
  async createInstance(challengeId: string, userId: string): Promise<ChallengeInstanceDto> {
    const doc = await ChallengeInstance.create({
      challenge: challengeId,
      user: userId,
      status: 'FAILED',
      failureReason: NOT_IMPLEMENTED_MESSAGE,
    });
    return toDto(doc);
  }

  async getInstance(instanceId: string): Promise<ChallengeInstanceDto> {
    const doc = await ChallengeInstance.findById(instanceId);
    if (!doc) throw AppError.notFound('Instance not found.');
    return toDto(doc);
  }

  async stopInstance(): Promise<void> {
    throw AppError.notImplemented(NOT_IMPLEMENTED_MESSAGE);
  }

  async restartInstance(): Promise<void> {
    throw AppError.notImplemented(NOT_IMPLEMENTED_MESSAGE);
  }
}

export const challengeRuntime: ChallengeRuntime = new NotImplementedRuntime();
