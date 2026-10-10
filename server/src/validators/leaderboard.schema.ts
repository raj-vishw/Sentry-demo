import { z } from 'zod';
import { paginationQuerySchema } from './pagination.schema.js';

export const leaderboardQuerySchema = paginationQuerySchema({ maxLimit: 100, defaultLimit: 20 }).extend({
  scope: z.enum(['global', 'weekly', 'monthly']).default('global'),
});
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;

export const teamLeaderboardQuerySchema = paginationQuerySchema({ maxLimit: 100, defaultLimit: 20 });
export type TeamLeaderboardQuery = z.infer<typeof teamLeaderboardQuerySchema>;
