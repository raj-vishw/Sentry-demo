import { Category, type CategoryDoc, type CategorySlug } from '../models/Category.js';
import { AppError } from '../utils/errors.js';
import { record as recordAudit } from './auditLog.service.js';
import type { UpdateCategoryInput } from '../validators/category.schema.js';

export interface CategoryDto {
  slug: string;
  name: string;
  description: string;
  icon: string;
  active: boolean;
}

function toDto(doc: CategoryDoc): CategoryDto {
  return { slug: doc.slug, name: doc.name, description: doc.description, icon: doc.icon, active: doc.active };
}

export async function listCategories(): Promise<CategoryDto[]> {
  const docs = await Category.find().sort({ name: 1 });
  return docs.map(toDto);
}

export async function updateCategory(adminId: string, slug: string, input: UpdateCategoryInput): Promise<CategoryDto> {
  // `slug` arrives as an arbitrary route-param string, not the narrower
  // CategorySlug literal union the schema's enum infers to — cast for the
  // query (an unknown value simply won't match and falls through to the
  // not-found check below, same as any other invalid lookup key).
  const doc = await Category.findOne({ slug: slug as CategorySlug });
  if (!doc) throw AppError.notFound('Category not found.');

  if (input.name !== undefined) doc.name = input.name;
  if (input.description !== undefined) doc.description = input.description;
  if (input.icon !== undefined) doc.icon = input.icon;
  if (input.active !== undefined) doc.active = input.active;
  await doc.save();

  await recordAudit(adminId, 'ADMIN', 'ADMIN_UPDATED_CATEGORY', 'category', slug);

  return toDto(doc);
}
