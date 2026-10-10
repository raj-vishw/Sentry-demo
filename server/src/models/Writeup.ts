import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { CATEGORY_SLUGS } from './Category.js';

export const WRITEUP_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED'] as const;
export type WriteupStatus = (typeof WRITEUP_STATUSES)[number];

const writeupSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true },
    challenge: { type: Schema.Types.ObjectId, ref: 'Challenge', required: true },
    // Denormalized from the challenge at creation time so listings can
    // filter/sort by category without joining on every request.
    category: { type: String, enum: CATEGORY_SLUGS, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 20000 },
    status: { type: String, enum: WRITEUP_STATUSES, default: 'DRAFT' },
    // Internal moderation note — only ever surfaced to the author or an
    // admin (see writeup.service's DTO mapping), never on a public read.
    rejectionReason: { type: String, default: null },
    // Never trust a client-supplied like count — likedBy/likesCount are only
    // ever mutated together in one atomic update (writeup.service#toggleLike),
    // the same "computed, not client-set" discipline used for team/
    // leaderboard standings elsewhere in this codebase.
    likedBy: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    likesCount: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// One compound index per public sort option (status is always the equality
// filter for the public listing), plus lookups by author/challenge.
writeupSchema.index({ status: 1, createdAt: -1 });
writeupSchema.index({ status: 1, views: -1 });
writeupSchema.index({ status: 1, likesCount: -1 });
writeupSchema.index({ author: 1 });
writeupSchema.index({ challenge: 1 });

export type WriteupDoc = HydratedDocument<InferSchemaType<typeof writeupSchema>>;

export const Writeup = model('Writeup', writeupSchema);
