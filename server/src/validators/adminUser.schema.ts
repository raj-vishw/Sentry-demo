import { z } from 'zod';
import { USER_ROLES, USER_STATUSES } from '../models/User.js';

export const listAdminUsersQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  sort: z.enum(['newest', 'oldest', 'points-desc', 'points-asc']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListAdminUsersQuery = z.infer<typeof listAdminUsersQuerySchema>;

// Filters only — no pagination. The export route itself caps the row count
// server-side (see adminUser.service.ts#exportUsersCsv).
export const exportUsersQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
});
export type ExportUsersQuery = z.infer<typeof exportUsersQuerySchema>;
