import { z } from 'zod';

export const listAuditLogsQuerySchema = z.object({
  actor: z.string().trim().max(24).optional(),
  action: z.string().trim().max(60).optional(),
  resourceType: z.string().trim().max(40).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
