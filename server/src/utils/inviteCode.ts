import { randomInt } from 'node:crypto';

const SUFFIX_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — easy to misread aloud

/** e.g. "REDSTORM-7X2Q" — a short, shareable, unambiguous invite code. */
export function generateInviteCode(teamName: string): string {
  const prefix = teamName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10) || 'TEAM';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += SUFFIX_ALPHABET[randomInt(SUFFIX_ALPHABET.length)];
  }
  return `${prefix}-${suffix}`;
}
