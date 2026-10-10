import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { CATEGORY_SLUGS } from './Category.js';

export const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'INSANE'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

// How a challenge executes — separate from `category`, which is just the
// subject-matter grouping (a WEB challenge can be STATIC or INTERACTIVE).
export const CHALLENGE_TYPES = ['STATIC', 'INTERACTIVE', 'HYBRID'] as const;
export type ChallengeType = (typeof CHALLENGE_TYPES)[number];

export const CHALLENGE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number];

export const ENVIRONMENT_PROTOCOLS = ['HTTP', 'TCP', 'UDP'] as const;
export type EnvironmentProtocol = (typeof ENVIRONMENT_PROTOCOLS)[number];

const challengeFileSchema = new Schema(
  {
    filename: { type: String, required: true },
    storageKey: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
  },
  { _id: true, timestamps: false },
);

// Metadata only — `image`/`port`/etc. describe what an interactive
// challenge WOULD run, but nothing in this codebase builds, pulls, or
// executes a container from this data yet (see services/runtime/). Kept
// embedded rather than a separate collection since it's 1:1 with the
// challenge and never queried independently.
const challengeEnvironmentSchema = new Schema(
  {
    runtime: { type: String, enum: ['DOCKER'], default: 'DOCKER' },
    image: { type: String, default: null },
    port: { type: Number, default: null },
    protocol: { type: String, enum: ENVIRONMENT_PROTOCOLS, default: 'HTTP' },
    cpuLimit: { type: Number, default: 1, min: 0 },
    memoryLimitMb: { type: Number, default: 512, min: 1 },
    timeoutSeconds: { type: Number, default: 3600, min: 1 },
  },
  { _id: false },
);

const challengeSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    shortDescription: { type: String, default: '', trim: true, maxlength: 160 },
    tags: { type: [String], default: [] },
    // Stored as the stable category slug (not an ObjectId ref) so listing,
    // filtering, and grouping never need a join — Category is still its
    // own collection for admin-managed display metadata (name/description/
    // icon), keyed by this same slug.
    category: { type: String, enum: CATEGORY_SLUGS, required: true },
    // Execution model — independent of category. Defaults to STATIC, which
    // Mongoose applies to any pre-existing document hydrated from the
    // database that lacks this field, so every challenge created before
    // this field existed reads as STATIC automatically (see
    // scripts/backfillChallengeType.ts for the belt-and-suspenders
    // one-time raw-query equivalent).
    type: { type: String, enum: CHALLENGE_TYPES, default: 'STATIC' },
    difficulty: { type: String, enum: DIFFICULTIES, required: true },
    points: { type: Number, required: true, min: 0 },
    // Never selected by default — only the flag-verification code path
    // should ever pull this field, and it's dropped from every response.
    flagHash: { type: String, required: true, select: false },
    flagFormat: { type: String, default: 'CTF{...}' },
    files: { type: [challengeFileSchema], default: [] },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Set only on an imported challenge, purely for display — the manifest's
    // claimed author is metadata, never a real User reference on this
    // instance (see services/challengePackage.service.ts#importChallenge).
    originalAuthor: { type: String, default: null },
    solves: { type: Number, default: 0 },
    // Source of truth for the lifecycle — superseded `published: boolean`.
    // Every former `doc.published` read site now reads
    // `doc.status === 'PUBLISHED'` instead (see challenge.service.ts) —
    // there is exactly one source of truth. See
    // scripts/backfillChallengeType.ts's sibling startup migration in
    // config/database.ts for how pre-existing documents (which have no
    // `status` field at all) get backfilled from their old `published`
    // value exactly once.
    status: { type: String, enum: CHALLENGE_STATUSES, default: 'DRAFT' },
    // null for STATIC challenges; required for INTERACTIVE/HYBRID (enforced
    // in validators/challenge.schema.ts, not at the schema level, since the
    // rule depends on `type`).
    environment: { type: challengeEnvironmentSchema, default: null },
    // Optional unlock-chain gate — null means always unlocked (the common
    // case). Validated server-side (no self-reference, no chained
    // prerequisites — see challenge.service.ts) rather than at the schema
    // level, since that validation needs to query other documents.
    prerequisite: { type: Schema.Types.ObjectId, ref: 'Challenge', default: null },
  },
  { timestamps: true },
);

challengeSchema.index({ category: 1 });
challengeSchema.index({ difficulty: 1 });
challengeSchema.index({ type: 1 });
challengeSchema.index({ tags: 1 });
// Backs the default (published-only, newest-first) challenge list query —
// the single most common request this collection serves.
challengeSchema.index({ status: 1, createdAt: -1 });

export type ChallengeDoc = HydratedDocument<InferSchemaType<typeof challengeSchema>>;

export const Challenge = model('Challenge', challengeSchema);
