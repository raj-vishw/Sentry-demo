import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';

const SALT_ROUNDS = 10;

/**
 * Flags are stored as a salted bcrypt hash — never in plaintext — so a
 * database leak alone does not disclose challenge flags. Comparison uses
 * bcrypt's constant-time check.
 */
export function hashFlag(plain: string): Promise<string> {
  return bcrypt.hash(plain.trim(), SALT_ROUNDS);
}

export function compareFlag(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain.trim(), hash);
}

/**
 * A one-way, unsalted digest of a submitted flag kept only for audit/abuse
 * analysis on the Submission log — not used for correctness checks, and
 * useless for recovering the plaintext of a correct flag.
 */
export function digestSubmittedFlag(plain: string): string {
  return createHash('sha256').update(plain.trim()).digest('hex');
}
