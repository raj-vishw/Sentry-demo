import { z } from 'zod';
import { paginationQuerySchema } from './pagination.schema.js';

export const listTeamsQuerySchema = paginationQuerySchema({ maxLimit: 50, defaultLimit: 20 });
export type ListTeamsQuery = z.infer<typeof listTeamsQuerySchema>;

const teamName = z
  .string()
  .trim()
  .min(3, 'Team name must be at least 3 characters.')
  .max(32, 'Team name must be at most 32 characters.')
  .regex(/^[A-Za-z0-9][A-Za-z0-9 _-]*$/, 'Team name may only contain letters, numbers, spaces, - and _.');

export const createTeamSchema = z.object({
  name: teamName,
  description: z.string().trim().max(280).optional(),
  avatar: z.string().trim().url('Avatar must be a valid URL.').max(500).optional(),
});
export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const updateTeamSchema = z
  .object({
    description: z.string().trim().max(280).optional(),
    avatar: z.string().trim().url('Avatar must be a valid URL.').max(500).nullable().optional(),
  })
  .refine((data) => data.description !== undefined || data.avatar !== undefined, {
    message: 'Provide at least one field to update.',
  });
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

export const joinTeamSchema = z.object({
  inviteCode: z.string().trim().min(1, 'Invite code is required.').max(32),
});
export type JoinTeamInput = z.infer<typeof joinTeamSchema>;
