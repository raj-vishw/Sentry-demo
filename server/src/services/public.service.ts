import { User } from '../models/User.js';
import { Challenge } from '../models/Challenge.js';
import { Category, CATEGORY_SLUGS, type CategorySlug } from '../models/Category.js';
import { Submission } from '../models/Submission.js';
import { getConfig } from './systemConfig.service.js';
import { getCompetitionConfig } from './competitionConfig.service.js';

export interface PublicStats {
  challenges: number;
  categories: number;
  solves: number;
  players: number;
}

// Unauthenticated, landing-page-only numbers — intentionally the smallest
// possible surface (counts only, no user/challenge identities) so this is
// safe to expose with no auth at all.
export async function getPublicStats(): Promise<PublicStats> {
  const [challenges, categories, solves, players] = await Promise.all([
    Challenge.countDocuments({ status: 'PUBLISHED' }),
    Category.countDocuments({ active: true }),
    Submission.countDocuments({ correct: true }),
    User.countDocuments(),
  ]);
  return { challenges, categories, solves, players };
}

export async function getPublicCategoryCounts(): Promise<Record<CategorySlug, number>> {
  const rows = await Challenge.aggregate<{ _id: CategorySlug; count: number }>([
    { $match: { status: 'PUBLISHED' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const counts = Object.fromEntries(CATEGORY_SLUGS.map((slug) => [slug, 0])) as Record<CategorySlug, number>;
  for (const row of rows) counts[row._id] = row.count;
  return counts;
}

export interface PublicPlatformConfig {
  platformName: string;
  platformDescription: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  accentColor: string | null;
  bootMessage: string | null;
  competitionName: string;
  startTime: Date | null;
  endTime: Date | null;
}

/**
 * The safe, no-auth subset of platform + competition config — fetched
 * once at boot by the frontend to apply branding (title, favicon, accent
 * color override, boot message). Deliberately excludes anything sensitive
 * (registrationEnabled/maintenanceMode are admin-only concerns, not needed
 * by this boot-time read; the leaderboard visibility is enforced
 * server-side per-request instead of exposed here).
 */
export async function getPublicPlatformConfig(): Promise<PublicPlatformConfig> {
  const [platform, competition] = await Promise.all([getConfig(), getCompetitionConfig()]);
  return {
    platformName: platform.platformName,
    platformDescription: platform.platformDescription,
    logoUrl: platform.logoUrl,
    faviconUrl: platform.faviconUrl,
    accentColor: platform.accentColor,
    bootMessage: platform.bootMessage,
    competitionName: competition.name,
    startTime: competition.startTime,
    endTime: competition.endTime,
  };
}
