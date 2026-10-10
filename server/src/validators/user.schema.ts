import { z } from 'zod';

export const updateProfileSchema = z
  .object({
    bio: z.string().trim().max(280).optional(),
    avatar: z.string().trim().url('Avatar must be a valid URL.').max(500).nullable().optional(),
  })
  .refine((data) => data.bio !== undefined || data.avatar !== undefined, {
    message: 'Provide at least one field to update.',
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
