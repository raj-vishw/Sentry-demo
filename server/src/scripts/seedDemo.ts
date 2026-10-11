/**
 * The one seed/reset script for this standalone demo deployment. Unlike
 * the main Sentry repo's split seed.ts (dev) / resetForTesting.ts
 * (testing), there is only one operation here: wipe this database and
 * recreate the known-good demo state. There is no partial/additive mode
 * to distinguish a "reset" from a "fresh seed" — this whole database IS
 * the demo, so `npm run seed:demo` and `npm run reset:demo` both just run
 * this file (see package.json).
 *
 * Identities for the two published demo accounts come from `.env`
 * (the DEMO_ADMIN_ and DEMO_USER_ variables), same convention as every
 * other piece of config in this codebase — never hardcoded here. They are intentionally
 * PUBLIC, documented credentials (see README.md/SECURITY.md), not secrets.
 *
 * Guarded by isolationGuard.ts — refuses to run against anything that
 * doesn't look like a dedicated demo database.
 */
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { assertSafeToModifyDatabase } from '../config/isolationGuard.js';
import { User } from '../models/User.js';
import { Team } from '../models/Team.js';
import { Category, CATEGORY_SLUGS } from '../models/Category.js';
import { Challenge } from '../models/Challenge.js';
import { Hint } from '../models/Hint.js';
import { Submission } from '../models/Submission.js';
import { Writeup } from '../models/Writeup.js';
import { Report } from '../models/Report.js';
import { AuditLog } from '../models/AuditLog.js';
import { Achievement } from '../models/Achievement.js';
import { Announcement } from '../models/Announcement.js';
import { Page } from '../models/Page.js';
import { ChallengeInstance } from '../models/ChallengeInstance.js';
import { SystemConfig } from '../models/SystemConfig.js';
import { CompetitionConfig } from '../models/CompetitionConfig.js';
import { hashPassword } from '../utils/password.js';
import { hashFlag } from '../utils/flag.js';
import { logger } from '../utils/logger.js';
import { updateConfig } from '../services/systemConfig.service.js';
import { updateCompetitionConfig } from '../services/competitionConfig.service.js';
import { cryptoChallenges } from './seedData/challenges/crypto.js';
import { forensicsChallenges } from './seedData/challenges/forensics.js';
import { reverseChallenges } from './seedData/challenges/reverse.js';
import { osintChallenges } from './seedData/challenges/osint.js';
import type { DemoChallengeSpec } from './seedData/types.js';

const CATEGORY_META: Record<string, { name: string; description: string; icon: string }> = {
  crypto: { name: 'Crypto', description: 'Break ciphers and attack weak implementations.', icon: 'key' },
  forensics: { name: 'Forensics', description: 'Recover evidence from disks, memory, and traffic.', icon: 'fingerprint' },
  reverse: { name: 'Reverse Engineering', description: 'Disassemble binaries and reconstruct hidden logic.', icon: 'cpu' },
  osint: { name: 'OSINT', description: 'Trace targets using publicly available information.', icon: 'satellite' },
};
const DEMO_CATEGORY_SLUGS = Object.keys(CATEGORY_META) as (typeof CATEGORY_SLUGS)[number][];

const ALL_CHALLENGES: DemoChallengeSpec[] = [
  ...cryptoChallenges,
  ...forensicsChallenges,
  ...reverseChallenges,
  ...osintChallenges,
];

function requireDemoEnv(envVar: string): string {
  const value = process.env[envVar];
  if (!value) {
    logger.error(`${envVar} is not set. Add it to server/.env (see .env.example) before running seed:demo.`);
    process.exit(1);
  }
  return value;
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export async function runSeed(): Promise<void> {
  assertSafeToModifyDatabase('seed');

  const DEMO_ADMIN = {
    username: requireDemoEnv('DEMO_ADMIN_USERNAME'),
    email: requireDemoEnv('DEMO_ADMIN_EMAIL'),
    password: requireDemoEnv('DEMO_ADMIN_PASSWORD'),
  };
  const DEMO_USER = {
    username: requireDemoEnv('DEMO_USER_USERNAME'),
    email: requireDemoEnv('DEMO_USER_EMAIL'),
    password: requireDemoEnv('DEMO_USER_PASSWORD'),
  };

  logger.info('Wiping all collections...');
  await Promise.all([
    User.deleteMany({}),
    Team.deleteMany({}),
    Category.deleteMany({}),
    Challenge.deleteMany({}),
    Hint.deleteMany({}),
    Submission.deleteMany({}),
    Writeup.deleteMany({}),
    Report.deleteMany({}),
    AuditLog.deleteMany({}),
    Achievement.deleteMany({}),
    Announcement.deleteMany({}),
    Page.deleteMany({}),
    ChallengeInstance.deleteMany({}),
    SystemConfig.deleteMany({}),
    CompetitionConfig.deleteMany({}),
  ]);

  logger.info('Seeding categories...');
  await Category.insertMany(
    DEMO_CATEGORY_SLUGS.map((slug) => ({ slug, ...CATEGORY_META[slug], active: true })),
  );

  logger.info('Seeding demo admin account...');
  const admin = await User.create({
    username: DEMO_ADMIN.username,
    email: DEMO_ADMIN.email,
    passwordHash: await hashPassword(DEMO_ADMIN.password),
    role: 'ADMIN',
  });

  logger.info('Seeding demo player account...');
  await User.create({
    username: DEMO_USER.username,
    email: DEMO_USER.email,
    passwordHash: await hashPassword(DEMO_USER.password),
    role: 'USER',
  });

  logger.info(`Seeding ${ALL_CHALLENGES.length} demo challenges...`);
  for (const c of ALL_CHALLENGES) {
    const challenge = await Challenge.create({
      title: c.title,
      slug: slugify(c.title),
      description: c.description,
      category: c.category,
      type: 'STATIC',
      difficulty: c.difficulty,
      points: c.points,
      flagHash: await hashFlag(c.flag),
      flagFormat: 'SENTRYDEMO{...}',
      author: admin._id,
      status: 'PUBLISHED',
    });
    if (c.hints.length > 0) {
      await Hint.insertMany(c.hints.map((h) => ({ ...h, challenge: challenge._id })));
    }
  }

  logger.info('Seeding platform + competition branding...');
  await updateConfig(String(admin._id), {
    platformName: 'Sentry Demo',
    platformDescription: 'A public, resettable demo of the Sentry CTF platform. Not for real competitions.',
    bootMessage: 'Welcome to the Sentry public demo.',
  });
  await updateCompetitionConfig(String(admin._id), {
    name: 'Sentry Demo CTF',
    description: 'A standing, always-on demonstration competition. Data resets periodically.',
    leaderboardVisibility: 'public',
  });

  logger.info('Seed complete.');
  logger.info('--- Public demo credentials (intentionally published — never secrets) ---');
  logger.info(`Admin:  ${DEMO_ADMIN.email} / ${DEMO_ADMIN.password}`);
  logger.info(`Player: ${DEMO_USER.email} / ${DEMO_USER.password}`);
  logger.info('---------------------------------------------------------------------------');
}

async function main() {
  await connectDatabase();
  await runSeed();
  await disconnectDatabase();
}

const isMainModule = process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href;
if (isMainModule) {
  main().catch((err) => {
    logger.error({ err }, 'Seed failed');
    process.exit(1);
  });
}
