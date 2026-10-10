import type { DemoChallengeSpec } from '../types.js';
import { toBase64, hexOfReversedBytes, rot47 } from '../encodeUtils.js';

const METADATA_FLAG = 'SENTRYDEMO{exif_fields_are_free_text}';
const metadataComment = toBase64(METADATA_FLAG);

const FRAGMENT_FLAG = 'SENTRYDEMO{disk_sectors_write_backwards}';
const fragmentHex = hexOfReversedBytes(FRAGMENT_FLAG);

const RESIDUE_FLAG = 'SENTRYDEMO{rot47_hides_in_plain_sight}';
const residueText = rot47(RESIDUE_FLAG);

export const forensicsChallenges: DemoChallengeSpec[] = [
  {
    title: 'Metadata Trail',
    category: 'forensics',
    difficulty: 'EASY',
    points: 100,
    description:
      'An uploaded image carries this EXIF field:\n\n' +
      `\`UserComment: ${metadataComment}\`\n\n` +
      'Whoever uploaded it left something readable in a field nobody checks.',
    flag: METADATA_FLAG,
    hints: [{ title: 'Encoding', content: 'The UserComment value is plain base64.', cost: 10, order: 0 }],
  },
  {
    title: 'Deleted Fragment',
    category: 'forensics',
    difficulty: 'MEDIUM',
    points: 300,
    description:
      'A recovered disk sector, dumped as hex:\n\n' +
      `\`${fragmentHex}\`\n\n` +
      "This controller's write cache is known to flush sectors with their byte order reversed from how they were written.",
    flag: FRAGMENT_FLAG,
    hints: [
      {
        title: 'Reversing the sector',
        content: 'Hex-decode to get the raw bytes, then reverse the ORDER of those bytes (not just the hex text) before reading it as ASCII.',
        cost: 30,
        order: 0,
      },
    ],
  },
  {
    title: 'Volatile Residue',
    category: 'forensics',
    difficulty: 'HARD',
    points: 450,
    description:
      'A string recovered from a live memory capture, visibly garbled by whatever obfuscation the capture tool applies ' +
      'to printable text before writing its report:\n\n' +
      `\`${residueText}\``,
    flag: RESIDUE_FLAG,
    hints: [
      {
        title: 'The obfuscation',
        content: 'This capture tool uses ROT47 — rotate every printable ASCII character by 47 positions. Applying it again undoes it.',
        cost: 45,
        order: 0,
      },
    ],
  },
];
