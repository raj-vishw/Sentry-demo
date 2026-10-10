import { User } from '../models/User.js';
import { SystemConfig, SYSTEM_CONFIG_ID } from '../models/SystemConfig.js';
import { AppError } from '../utils/errors.js';
import { hashPassword } from '../utils/password.js';
import { toSafeUser } from './user.service.js';
import { issueTokens, type AuthResult } from './auth.service.js';
import { getConfig } from './systemConfig.service.js';
import type { InitializeSetupInput } from '../validators/setup.schema.js';

const DUPLICATE_KEY_ERROR = 11000;

/**
 * Setup counts as done if either the wizard's own flag was set, OR an admin
 * already exists by some other means (an older deployment upgrading into
 * this feature, a local dev database seeded before this flag existed, a
 * deliberately hand-provisioned account, ...). Checking only the flag would
 * otherwise strand every pre-existing installation on the wizard forever,
 * even though they already have a working admin account.
 */
async function isSetupEffectivelyDone(): Promise<boolean> {
  const config = await getConfig();
  if (config.setupCompleted) return true;
  return (await User.exists({ role: 'ADMIN' })) !== null;
}

export async function getSetupStatus(): Promise<{ completed: boolean }> {
  return { completed: await isSetupEffectivelyDone() };
}

/**
 * Creates the first admin account through the browser instead of requiring
 * direct database/script access. Safe to call only once, enforced
 * atomically: the update's filter only matches a config doc that is NOT
 * already marked complete, so a second call (or two racing concurrent
 * calls) can never both succeed — the loser hits the same unique-`_id`
 * conflict the create-then-catch pattern elsewhere in this codebase
 * (Submission, Achievement) relies on for "at most once" semantics.
 */
export async function initializeSetup(input: InitializeSetupInput): Promise<AuthResult> {
  if (await isSetupEffectivelyDone()) {
    throw AppError.conflict('Setup has already been completed.');
  }

  try {
    await SystemConfig.findOneAndUpdate(
      { _id: SYSTEM_CONFIG_ID, setupCompleted: { $ne: true } },
      { $set: { setupCompleted: true } },
      { upsert: true },
    );
  } catch (err) {
    const mongoErr = err as { code?: number };
    if (mongoErr.code === DUPLICATE_KEY_ERROR) {
      throw AppError.conflict('Setup has already been completed.');
    }
    throw err;
  }

  // The flag above is now claimed, serializing any concurrent calls — but
  // if account creation below fails for any reason, that claim must be
  // released, or a bad first attempt (e.g. a duplicate from a double-click)
  // would permanently lock the self-hoster out of ever completing setup.
  try {
    const existing = await User.findOne({
      $or: [{ email: input.email.toLowerCase() }, { usernameLower: input.username.toLowerCase() }],
    });
    if (existing) {
      throw AppError.conflict('An account with that username or email already exists.');
    }

    const passwordHash = await hashPassword(input.password);
    // role is forced here, never read from `input` — same distrust-the-client
    // principle applied to login's role field (see auth.service.ts#login).
    const user = await User.create({
      username: input.username,
      email: input.email,
      passwordHash,
      role: 'ADMIN',
    });

    const tokens = issueTokens(user);
    return { user: await toSafeUser(user), ...tokens };
  } catch (err) {
    await SystemConfig.updateOne({ _id: SYSTEM_CONFIG_ID }, { $set: { setupCompleted: false } });
    throw err;
  }
}
