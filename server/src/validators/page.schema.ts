import { z } from 'zod';

export const createPageSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Slug is required.')
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only.'),
  title: z.string().trim().min(1, 'Title is required.').max(120),
  content: z.string().max(50_000).default(''),
});
export type CreatePageInput = z.infer<typeof createPageSchema>;

export const updatePageSchema = createPageSchema.partial();
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
