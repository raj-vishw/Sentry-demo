import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const TEAM_ROLES = ['OWNER', 'MEMBER'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const MAX_TEAM_MEMBERS = 6;

const teamMemberSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: TEAM_ROLES, required: true },
    joinedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const teamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 32 },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: '', maxlength: 280 },
    avatar: { type: String, default: null },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [teamMemberSchema], default: [] },
    // Never trust a client-supplied point total — team standings are always
    // computed live from members' solved challenges (see
    // team.service#computeTeamStats), the same way a single user's rank is
    // computed rather than stored. This column intentionally does not
    // exist. The invite code below is the only piece of team state that
    // genuinely needs to be stored and mutated directly.
    inviteCode: { type: String, required: true, unique: true },
    // Same admin-only leaderboard visibility toggle as User.hidden — a
    // hidden team's members still accrue points normally, the team is
    // just filtered out of the team leaderboard.
    hidden: { type: Boolean, default: false },
  },
  { timestamps: true },
);

teamSchema.index({ name: 1 });
teamSchema.index({ 'members.user': 1 });

export type TeamDoc = HydratedDocument<InferSchemaType<typeof teamSchema>>;

export const Team = model('Team', teamSchema);
