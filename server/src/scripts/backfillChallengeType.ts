/**
 * Optional, one-time, idempotent backfill: writes `type: 'STATIC'` onto
 * any Challenge document that physically lacks the `type` field.
 *
 * Not required for correctness — Mongoose already applies the schema's
 * `default: 'STATIC'` to any document hydrated from the database that's
 * missing the field, so every API response already reads existing
 * challenges as STATIC with zero migration. This script exists only for
 * anyone querying the raw collection directly (e.g. `db.challenges.find({
 * type: 'STATIC' })` in a mongo shell), which would otherwise miss
 * pre-existing documents that have no `type` key at all.
 *
 * Safe to run against a live database any number of times.
 */
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Challenge } from '../models/Challenge.js';
import { logger } from '../utils/logger.js';

async function main() {
  await connectDatabase();
  const result = await Challenge.collection.updateMany(
    { type: { $exists: false } },
    { $set: { type: 'STATIC' } },
  );
  logger.info({ modified: result.modifiedCount }, 'Backfilled challenge type');
  await disconnectDatabase();
}

main().catch((err) => {
  logger.error({ err }, 'Backfill failed');
  process.exit(1);
});
