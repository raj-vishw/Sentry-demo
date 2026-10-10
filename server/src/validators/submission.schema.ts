import { z } from 'zod';

export const submitFlagSchema = z.object({
  flag: z.string().trim().min(1, 'Enter a flag before submitting.').max(500),
});

export type SubmitFlagInput = z.infer<typeof submitFlagSchema>;
