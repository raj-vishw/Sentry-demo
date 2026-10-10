import { z } from 'zod';
import { LEADERBOARD_VISIBILITIES } from '../models/CompetitionConfig.js';

export const updateCompetitionConfigSchema = z.object({
  name: z.string().trim().max(120).optional(),
  description: z.string().trim().max(500).optional(),
  rules: z.string().trim().max(10_000).optional(),
  startTime: z.coerce.date().nullable().optional(),
  endTime: z.coerce.date().nullable().optional(),
  freezeTime: z.coerce.date().nullable().optional(),
  leaderboardVisibility: z.enum(LEADERBOARD_VISIBILITIES).optional(),
});

export type UpdateCompetitionConfigInput = z.infer<typeof updateCompetitionConfigSchema>;
