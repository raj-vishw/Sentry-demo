import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const INSTANCE_STATUSES = ['STARTING', 'RUNNING', 'STOPPING', 'STOPPED', 'FAILED', 'EXPIRED'] as const;
export type InstanceStatus = (typeof INSTANCE_STATUSES)[number];

/**
 * One running (or attempted) instance of an INTERACTIVE/HYBRID challenge
 * for one user. This phase's only `ChallengeRuntime` implementation
 * (services/runtime/NotImplementedRuntime.ts) never actually starts
 * anything — every instance it creates lands directly in FAILED — but the
 * model, ownership, and lifecycle API around it are fully real, so a real
 * runtime can be dropped in later without changing this shape.
 */
const challengeInstanceSchema = new Schema(
  {
    challenge: { type: Schema.Types.ObjectId, ref: 'Challenge', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
    status: { type: String, enum: INSTANCE_STATUSES, required: true },
    runtime: { type: String, default: 'DOCKER' },
    endpoint: { type: String, default: null },
    failureReason: { type: String, default: null },
    lastActivityAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

challengeInstanceSchema.index({ challenge: 1, user: 1 });
challengeInstanceSchema.index({ status: 1, expiresAt: 1 });

export type ChallengeInstanceDoc = HydratedDocument<InferSchemaType<typeof challengeInstanceSchema>>;

export const ChallengeInstance = model('ChallengeInstance', challengeInstanceSchema);
