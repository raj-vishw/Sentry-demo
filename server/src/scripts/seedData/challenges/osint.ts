import type { DemoChallengeSpec } from '../types.js';
import { nibbleSwappedHex, toBase64, rot13 } from '../encodeUtils.js';

const HANDLE_FLAG = 'SENTRYDEMO{shadow_footprint_archive}';

const DRIFT_FLAG = 'SENTRYDEMO{link_shorteners_swap_nibbles}';
const driftHex = nibbleSwappedHex(DRIFT_FLAG);

const SNAPSHOT_FLAG = 'SENTRYDEMO{archived_pages_hide_in_reverse}';
// Build order: reverse -> rot13 -> base64. Solve order is the reverse of that.
const snapshotReversed = SNAPSHOT_FLAG.split('').reverse().join('');
const snapshotRotated = rot13(snapshotReversed);
const snapshotCipher = toBase64(snapshotRotated);

export const osintChallenges: DemoChallengeSpec[] = [
  {
    title: 'Archived Handle',
    category: 'osint',
    difficulty: 'EASY',
    points: 100,
    description:
      'Three defunct forum profiles, all believed to belong to the same person, archived oldest to newest:\n\n' +
      '1. *"first post here, this is my little SHADOW corner of the internet"*\n' +
      '2. *"moved my stuff, still leaving a FOOTPRINT wherever I go"*\n' +
      '3. *"final update before I disappear — this ARCHIVE is all that is left"*\n\n' +
      'The flag is the three capitalized words, lowercased, joined by underscores, in the order the posts are dated.',
    flag: HANDLE_FLAG,
    hints: [{ title: 'Order matters', content: 'Oldest post first: shadow, then footprint, then archive.', cost: 10, order: 0 }],
  },
  {
    title: 'Satellite Drift',
    category: 'osint',
    difficulty: 'MEDIUM',
    points: 300,
    description:
      "A shortened share-link's slug, recovered from a cached redirect table:\n\n" +
      `\`${driftHex}\`\n\n` +
      "This particular link shortener is known to swap the two hex digits within every byte before storing a slug."
    ,
    flag: DRIFT_FLAG,
    hints: [
      {
        title: 'Un-swapping',
        content: 'Swap each pair of hex characters back (so "ab" becomes "ba"), then hex-decode the result to ASCII.',
        cost: 30,
        order: 0,
      },
    ],
  },
  {
    title: 'Cached Snapshot',
    category: 'osint',
    difficulty: 'HARD',
    points: 450,
    description:
      'An archive crawler preserved a deleted page title, but only after three passes of its own storage pipeline:\n\n' +
      `\`${snapshotCipher}\`\n\n` +
      'The pipeline is documented, in order: reverse the text, then ROT13 it, then base64-encode the result for storage.',
    flag: SNAPSHOT_FLAG,
    hints: [
      {
        title: 'Undoing the pipeline',
        content: 'Base64-decode first, then ROT13 (which is its own inverse), then reverse the resulting text.',
        cost: 45,
        order: 0,
      },
    ],
  },
];
