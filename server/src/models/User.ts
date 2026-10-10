import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const USER_ROLES = ['USER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['ACTIVE', 'DISABLED', 'BANNED', 'PENDING'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

const solvedChallengeSchema = new Schema(
  {
    challenge: { type: Schema.Types.ObjectId, ref: 'Challenge', required: true },
    points: { type: Number, required: true },
    solvedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    username: { type: String, required: true, trim: true, minlength: 3, maxlength: 24 },
    usernameLower: { type: String, required: true, unique: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'USER' },
    // DISABLED blocks login/refresh entirely (see auth.service.ts) — never
    // deletes history. BANNED is deliberately different: a banned account
    // can still log in and browse read-only, it just can't submit flags,
    // unlock hints, join/create a team, or submit a writeup (see
    // userStatus.service.ts's assertNotBanned, called from each of those
    // services). PENDING is a new account awaiting admin approval (see
    // SystemConfig.registrationRequiresApproval) — blocked from login just
    // like DISABLED, until an admin flips it to ACTIVE or deletes it.
    // None of this is enforced per-request — a user's already-issued
    // access token (<=15m) keeps working for every route until it expires
    // or they try to refresh, the same trust window the access/refresh
    // design already accepts elsewhere.
    status: { type: String, enum: USER_STATUSES, default: 'ACTIVE' },
    avatar: { type: String, default: null },
    bio: { type: String, default: '', maxlength: 280 },
    points: { type: Number, default: 0 },
    solvedChallenges: { type: [solvedChallengeSchema], default: [] },
    team: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
    unlockedHints: { type: [Schema.Types.ObjectId], ref: 'Hint', default: [] },
    lastLoginAt: { type: Date, default: null },
    // Bumped on every refresh-token rotation and on logout, which
    // immediately invalidates every refresh token issued before the bump.
    tokenVersion: { type: Number, default: 0 },
    // Admin-only leaderboard visibility toggle — a hidden user still plays
    // normally (points/rank accrue, their own rank-among-visible-peers is
    // still correct on their own profile) but is filtered out of every
    // PUBLIC leaderboard aggregation and out of other users' rank counts.
    // Distinct from `status` — this is about display, not account access.
    hidden: { type: Boolean, default: false },
  },
  { timestamps: true },
);

userSchema.index({ points: -1 });

userSchema.pre('validate', function () {
  if (this.username) {
    this.usernameLower = this.username.toLowerCase();
  }
});

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;

export const User = model('User', userSchema);
