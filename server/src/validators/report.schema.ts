import { z } from 'zod';
import { REPORT_TARGET_TYPES, REPORT_STATUSES } from '../models/Report.js';

export const createReportSchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: z.string().trim().min(1, 'A target is required.'),
  reason: z.string().trim().min(3, 'A reason is required.').max(500),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const listAdminReportsQuerySchema = z.object({
  status: z.enum(REPORT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListAdminReportsQuery = z.infer<typeof listAdminReportsQuerySchema>;
