import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

mongoose.set('strictQuery', true);

export async function connectDatabase(): Promise<void> {
  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  await mongoose.connect(env.MONGODB_URI);
  logger.info('MongoDB connected');
  await runStartupMigrations();
}

/**
 * One-time, idempotent backfill for documents that pre-date the
 * DRAFT/PUBLISHED/ARCHIVED lifecycle (see models/Challenge.ts). Unlike the
 * `type` field's default (which Mongoose applies on read to any document
 * simply missing the field), the correct `status` value depends on each
 * document's old `published` boolean, so it can't be expressed as a
 * schema default alone — it needs one real write, done here against the
 * raw collection (bypassing Mongoose's schema, which no longer declares
 * `published` as a path) so the legacy field is still readable. Safe to
 * run on every boot: once every document has `status`, both queries below
 * match nothing.
 */
export async function runStartupMigrations(): Promise<void> {
  const { Challenge } = await import('../models/Challenge.js');
  const publishedResult = await Challenge.collection.updateMany(
    { status: { $exists: false }, published: true },
    { $set: { status: 'PUBLISHED' } },
  );
  const draftResult = await Challenge.collection.updateMany(
    { status: { $exists: false } },
    { $set: { status: 'DRAFT' } },
  );
  const totalBackfilled = publishedResult.modifiedCount + draftResult.modifiedCount;
  if (totalBackfilled > 0) {
    logger.info(
      { published: publishedResult.modifiedCount, draft: draftResult.modifiedCount },
      'Backfilled challenge status from legacy published field',
    );
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected gracefully');
}
