import { z } from 'zod';

// Category *slugs* are a fixed 8-value enum shared with Challenge.category
// (see models/Category.ts) — admins manage display metadata for the existing
// categories, not arbitrary new ones, so this is update-only. See
// server/README.md "What's Out of Scope" for why.
export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(40).optional(),
    description: z.string().trim().max(280).optional(),
    icon: z.string().trim().max(40).optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'Provide at least one field to update.',
  });
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
