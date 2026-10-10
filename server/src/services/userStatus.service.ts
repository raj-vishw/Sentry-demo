import { AppError } from '../utils/errors.js';

/**
 * Shared guard for the handful of actions a BANNED account can't take
 * (submit a flag, unlock a hint, join/create a team, submit a writeup) —
 * one place rather than five copy-pasted checks. Deliberately NOT called
 * from auth.service.ts's login/refresh: a banned account must still be
 * able to log in and browse read-only, that's the whole point of BANNED
 * being distinct from DISABLED.
 */
export function assertNotBanned(user: { status: string }): void {
  if (user.status === 'BANNED') {
    throw AppError.forbidden('Your account is banned from this action.');
  }
}
