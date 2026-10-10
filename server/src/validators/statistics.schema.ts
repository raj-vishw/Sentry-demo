import { z } from 'zod';

export const STATS_RANGES = ['24h', '7d', '30d', '90d', 'all'] as const;
export type StatsRange = (typeof STATS_RANGES)[number];

export const statisticsRangeQuerySchema = z.object({
  range: z.enum(STATS_RANGES).default('7d'),
});
export type StatisticsRangeQuery = z.infer<typeof statisticsRangeQuerySchema>;
