import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  message: z.string().trim().min(1, 'Message is required.').max(500),
});
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
