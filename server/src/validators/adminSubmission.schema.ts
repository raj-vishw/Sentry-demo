import { z } from 'zod';
import { CATEGORY_SLUGS } from '../models/Category.js';

export const listAdminSubmissionsQuerySchema = z
  .object({
    username: z.string().trim().max(60).optional(),
    challengeId: z.string().trim().optional(),
    category: z.enum(CATEGORY_SLUGS).optional(),
    result: z.enum(['correct', 'incorrect']).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .refine((data) => !data.startDate || !data.endDate || data.startDate <= data.endDate, {
    message: 'startDate must be before endDate.',
    path: ['startDate'],
  });
export type ListAdminSubmissionsQuery = z.infer<typeof listAdminSubmissionsQuerySchema>;

// Filters only — no pagination. See adminSubmission.service.ts#exportSubmissionsCsv.
export const exportSubmissionsQuerySchema = z
  .object({
    username: z.string().trim().max(60).optional(),
    challengeId: z.string().trim().optional(),
    category: z.enum(CATEGORY_SLUGS).optional(),
    result: z.enum(['correct', 'incorrect']).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine((data) => !data.startDate || !data.endDate || data.startDate <= data.endDate, {
    message: 'startDate must be before endDate.',
    path: ['startDate'],
  });
export type ExportSubmissionsQuery = z.infer<typeof exportSubmissionsQuerySchema>;
