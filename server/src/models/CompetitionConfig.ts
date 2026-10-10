import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

// Deliberately a separate singleton from SystemConfig — platform settings
// (branding, registration, maintenance) are about the deployment itself;
// competition settings are about the event currently running on it. A
// self-hoster could in principle reset/reconfigure one without touching
// the other (e.g. running a second competition on the same instance).
export const COMPETITION_CONFIG_ID = 'singleton';

export const LEADERBOARD_VISIBILITIES = ['public', 'hidden'] as const;
export type LeaderboardVisibility = (typeof LEADERBOARD_VISIBILITIES)[number];

const competitionConfigSchema = new Schema(
  {
    _id: { type: String, default: COMPETITION_CONFIG_ID },
    name: { type: String, default: '', trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    rules: { type: String, default: '', trim: true, maxlength: 10_000 },
    // Display-only in this phase — nothing blocks submissions outside this
    // window yet (see docs/architecture/overview.md's deferred list; this
    // is the same "timed competition" feature already deferred twice).
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    // Real enforcement, same isAdmin-bypass convention as
    // leaderboardVisibility below: once this time has passed, non-admin
    // viewers of the global leaderboard see a snapshot frozen at this
    // instant instead of live standings (leaderboard.service.ts#isFrozen).
    // Scoring itself is never touched — a solve after freezeTime still
    // counts, it just doesn't move the frozen display.
    freezeTime: { type: Date, default: null },
    // The other field here with real enforcement — see
    // services/leaderboard.service.ts's isAdmin-bypass check.
    leaderboardVisibility: { type: String, enum: LEADERBOARD_VISIBILITIES, default: 'public' },
  },
  { timestamps: true },
);

export type CompetitionConfigDoc = HydratedDocument<InferSchemaType<typeof competitionConfigSchema>>;

export const CompetitionConfig = model('CompetitionConfig', competitionConfigSchema);
