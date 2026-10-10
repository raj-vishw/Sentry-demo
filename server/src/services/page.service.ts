import { Types } from 'mongoose';
import { Page } from '../models/Page.js';
import { AppError } from '../utils/errors.js';
import { record as recordAudit } from './auditLog.service.js';
import type { CreatePageInput, UpdatePageInput } from '../validators/page.schema.js';

export interface PageListItemDto {
  slug: string;
  title: string;
}

export interface PageContentDto {
  slug: string;
  title: string;
  content: string;
}

export interface PageAdminDto extends PageContentDto {
  id: string;
  updatedAt: Date;
}

// Public — sorted alphabetically by title since, unlike docs.service.ts's
// fixed DOC_GROUPS, there's no admin-defined grouping/ordering for pages.
export async function listPages(): Promise<PageListItemDto[]> {
  const pages = await Page.find().select('slug title').sort({ title: 1 });
  return pages.map((p) => ({ slug: p.slug, title: p.title }));
}

export async function getPage(slug: string): Promise<PageContentDto> {
  const page = await Page.findOne({ slug });
  if (!page) throw AppError.notFound('Page not found.');
  return { slug: page.slug, title: page.title, content: page.content };
}

export async function listPagesAdmin(): Promise<PageAdminDto[]> {
  const pages = await Page.find().sort({ title: 1 });
  return pages.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    content: p.content,
    updatedAt: p.updatedAt,
  }));
}

export async function createPage(adminId: string, input: CreatePageInput): Promise<PageAdminDto> {
  const existing = await Page.findOne({ slug: input.slug });
  if (existing) throw AppError.conflict('A page with that slug already exists.');

  const page = await Page.create(input);
  await recordAudit(adminId, 'ADMIN', 'ADMIN_CREATED_PAGE', 'page', page.id);

  return { id: page.id, slug: page.slug, title: page.title, content: page.content, updatedAt: page.updatedAt };
}

export async function updatePage(adminId: string, id: string, input: UpdatePageInput): Promise<PageAdminDto> {
  if (!Types.ObjectId.isValid(id)) throw AppError.notFound('Page not found.');

  if (input.slug) {
    const existing = await Page.findOne({ slug: input.slug, _id: { $ne: id } });
    if (existing) throw AppError.conflict('A page with that slug already exists.');
  }

  const page = await Page.findByIdAndUpdate(id, { $set: input }, { returnDocument: 'after' });
  if (!page) throw AppError.notFound('Page not found.');

  await recordAudit(adminId, 'ADMIN', 'ADMIN_UPDATED_PAGE', 'page', id, { ...input });

  return { id: page.id, slug: page.slug, title: page.title, content: page.content, updatedAt: page.updatedAt };
}

export async function deletePage(adminId: string, id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) throw AppError.notFound('Page not found.');

  const page = await Page.findByIdAndDelete(id);
  if (!page) throw AppError.notFound('Page not found.');

  await recordAudit(adminId, 'ADMIN', 'ADMIN_DELETED_PAGE', 'page', id, { slug: page.slug });
}
