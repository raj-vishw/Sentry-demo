import type { DemoChallengeSpec } from '../types.js';
import { toBase64, xorHex } from '../encodeUtils.js';

const COOKIE_FLAG = 'SENTRYDEMO{cookies_are_not_a_vault}';
const cookieJson = JSON.stringify({ user: 'guest', role: 'guest', note: COOKIE_FLAG });
const cookieValue = toBase64(cookieJson);

const HEADER_FLAG = 'SENTRYDEMO{xor_headers_leak_secrets}';
const headerHex = xorHex(HEADER_FLAG, 'Z');

const CACHE_FLAG = 'SENTRYDEMO{robots_dot_txt_hides_nothing}';
// Build order: reverse -> base64 -> hex. Solve order is the reverse of that.
const cacheReversed = CACHE_FLAG.split('').reverse().join('');
const cacheBase64 = toBase64(cacheReversed);
const cacheHex = Buffer.from(cacheBase64, 'utf8').toString('hex');

export const webChallenges: DemoChallengeSpec[] = [
  {
    title: 'Cookie Jar',
    category: 'web',
    difficulty: 'EASY',
    points: 100,
    description:
      'A staging login endpoint sets this session cookie on every response, including for anonymous visitors:\n\n' +
      `\`Set-Cookie: session=${cookieValue}; HttpOnly\`\n\n` +
      'Session cookies like this one are usually just an encoded object. Decode it and read the field that looks out of place.',
    flag: COOKIE_FLAG,
    hints: [
      {
        title: 'Decoding the cookie',
        content: 'The cookie value is standard base64 — `echo "<value>" | base64 -d` gives you readable JSON.',
        cost: 10,
        order: 0,
      },
    ],
  },
  {
    title: 'Header Trouble',
    category: 'web',
    difficulty: 'MEDIUM',
    points: 300,
    description:
      'A debug build of an internal API leaks this response header on every request:\n\n' +
      `\`X-Debug-Token: ${headerHex}\`\n\n` +
      'The token is hex-encoded, and the underlying bytes were XORed against a single repeating byte before being hex-encoded — ' +
      "the ASCII code for the capital letter the team used as their internal codename, \"Zulu.\"",
    flag: HEADER_FLAG,
    hints: [
      {
        title: 'The key byte',
        content: 'Hex-decode the token to get raw bytes, then XOR every byte against the ASCII code for the single capital letter "Z".',
        cost: 30,
        order: 0,
      },
    ],
  },
  {
    title: 'Robots Only',
    category: 'web',
    difficulty: 'HARD',
    points: 450,
    description:
      'A disallowed path from `robots.txt` still serves a stale cache file. Its contents, as hex:\n\n' +
      `\`${cacheHex}\`\n\n` +
      'Whatever tool generated this cache file ran the original page title through three transforms before writing it out. Work backwards.',
    flag: CACHE_FLAG,
    hints: [
      {
        title: 'Peeling the layers',
        content: 'Hex-decode first — that gives you a base64 string. Base64-decode that, then reverse the characters of what comes out.',
        cost: 45,
        order: 0,
      },
    ],
  },
];
