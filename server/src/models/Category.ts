import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

// Kept identical to the frontend's `Category` union (client/src/types) so no
// mapping layer is needed between the API and the UI.
export const CATEGORY_SLUGS = [
  'web',
  'crypto',
  'forensics',
  'reverse',
  'pwn',
  'osint',
  'cloud',
  'mobile',
] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, enum: CATEGORY_SLUGS },
    description: { type: String, default: '', trim: true },
    icon: { type: String, default: 'flag' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type CategoryDoc = HydratedDocument<InferSchemaType<typeof categorySchema>>;

export const Category = model('Category', categorySchema);
