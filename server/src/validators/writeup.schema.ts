import { z } from 'zod';
import { CATEGORY_SLUGS } from '../models/Category.js';

export const createWriteupSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters.').max(120),
  challengeId: z.string().trim().min(1, 'A challenge is required.'),
  content: z.string().trim().min(50, 'Writeup content must be at least 50 characters.').max(20000),
});
export type CreateWriteupInput = z.infer<typeof createWriteupSchema>;

export const updateWriteupSchema = z
  .object({
    title: z.string().trim().min(3).max(120).optional(),
    content: z.string().trim().min(50).max(20000).optional(),
  })
  .refine((data) => data.title !== undefined || data.content !== undefined, {
    message: 'Provide at least one field to update.',
  });
export type UpdateWriteupInput = z.infer<typeof updateWriteupSchema>;

export const rejectWriteupSchema = z.object({
  reason: z.string().trim().min(3, 'A reason is required.').max(500),
});
export type RejectWriteupInput = z.infer<typeof rejectWriteupSchema>;

export const listWriteupsQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: z.enum(CATEGORY_SLUGS).optional(),
  author: z.string().trim().max(24).optional(),
  sort: z.enum(['newest', 'most-viewed', 'most-liked']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
export type ListWriteupsQuery = z.infer<typeof listWriteupsQuerySchema>;

export const listAdminWriteupsQuerySchema = z.object({
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListAdminWriteupsQuery = z.infer<typeof listAdminWriteupsQuerySchema>;
