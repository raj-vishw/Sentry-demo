import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

// Admin-authored custom pages (e.g. "Code of Conduct", "Prizes") — a
// small DB-backed CMS, distinct from docs.service.ts's fixed-file
// allowlist. The admin chooses the slug directly (not auto-derived from
// title) since a page's URL is meant to be stable and memorable.
const pageSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 60 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    content: { type: String, default: '', maxlength: 50_000 },
  },
  { timestamps: true },
);

export type PageDoc = HydratedDocument<InferSchemaType<typeof pageSchema>>;

export const Page = model('Page', pageSchema);
