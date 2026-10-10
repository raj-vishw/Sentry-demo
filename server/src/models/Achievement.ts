import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

// Fixed, code-defined catalog rather than an admin-editable collection —
// ~10 types doesn't justify a CRUD surface (same reasoning as the fixed
// DIFFICULTIES enum on Challenge). Category-scoped types are suffixed with
// the category slug at award time (e.g. `CATEGORY_MASTER_web`), so the
// stored `type` string is the actual uniqueness key, not just a label.
export const ACHIEVEMENT_TYPES = [
  'FIRST_SOLVE',
  'SOLVE_COUNT_10',
  'SOLVE_COUNT_25',
  'SOLVE_COUNT_50',
  'STREAK_7',
  'STREAK_30',
  'FIRST_BLOOD',
  'FIRST_WRITEUP_PUBLISHED',
  'TEAM_FOUNDER',
  'CATEGORY_MASTER',
] as const;
export type AchievementBaseType = (typeof ACHIEVEMENT_TYPES)[number];

const achievementSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // The full type string, e.g. "FIRST_BLOOD" or "CATEGORY_MASTER_web" —
    // category-scoped achievements bake the category slug in here so the
    // {user,type} unique index naturally allows one per category.
    type: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// At most one of each achievement type per user, enforced by the DB —
// the same "race-safe uniqueness via an index, not just an application
// check" pattern already used for Submission's solve-uniqueness index.
achievementSchema.index({ user: 1, type: 1 }, { unique: true });

export type AchievementDoc = HydratedDocument<InferSchemaType<typeof achievementSchema>>;

export const Achievement = model('Achievement', achievementSchema);
