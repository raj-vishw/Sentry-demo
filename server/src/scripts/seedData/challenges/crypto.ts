import type { DemoChallengeSpec } from '../types.js';
import { rot13, xorHex, vigenereEncode } from '../encodeUtils.js';

const CAESAR_FLAG = 'SENTRYDEMO{rot13_is_not_encryption}';
const caesarCipher = rot13(CAESAR_FLAG);

const REPETITION_FLAG = 'SENTRYDEMO{keystream_reuse_is_fatal}';
const repetitionKey = 'io';
const repetitionHex = xorHex(REPETITION_FLAG, repetitionKey);

const VIGENERE_FLAG = 'SENTRYDEMO{vigenere_keys_repeat_too}';
const vigenereKey = 'FLAG';
const vigenereCipher = vigenereEncode(VIGENERE_FLAG, vigenereKey);

export const cryptoChallenges: DemoChallengeSpec[] = [
  {
    title: "Caesar's Ghost",
    category: 'crypto',
    difficulty: 'EASY',
    points: 100,
    description:
      'An intercepted note, enciphered with the oldest trick in the book:\n\n' +
      `\`${caesarCipher}\`\n\n` +
      'Every letter has been rotated by the same fixed amount. Try the classic one.',
    flag: CAESAR_FLAG,
    hints: [
      { title: 'Which rotation', content: 'Rotate every letter by 13 positions — it is its own inverse.', cost: 10, order: 0 },
    ],
  },
  {
    title: 'Repetition Leaks',
    category: 'crypto',
    difficulty: 'MEDIUM',
    points: 300,
    description:
      'A custom stream cipher reused its keystream across messages. One intercepted ciphertext, hex-encoded:\n\n' +
      `\`${repetitionHex}\`\n\n` +
      'You know the plaintext starts with `SENTRYDEMO{` and that the key is exactly 2 bytes long.',
    flag: REPETITION_FLAG,
    hints: [
      {
        title: 'Known-plaintext attack',
        content:
          'XOR the first few bytes of the ciphertext against the known plaintext prefix — that recovers the keystream, ' +
          'and since the key repeats every 2 bytes, a handful of recovered bytes already reveals the whole key.',
        cost: 30,
        order: 0,
      },
    ],
  },
  {
    title: 'Vigenère Vault',
    category: 'crypto',
    difficulty: 'HARD',
    points: 450,
    description:
      'A short dispatch, enciphered with a repeating-key substitution that only touches letters (punctuation and digits ' +
      'pass straight through):\n\n' +
      `\`${vigenereCipher}\`\n\n` +
      'The key is exactly 4 letters long, and the plaintext — like every dispatch in this archive — starts with `SENTRYDEMO{`.',
    flag: VIGENERE_FLAG,
    hints: [
      {
        title: 'Recovering the key',
        content:
          'The known prefix "SENTRYDEMO" has 10 letters before the first punctuation mark — more than enough repeats of a ' +
          '4-letter key to recover it via a known-plaintext attack (subtract the known plaintext letters from the ciphertext letters, mod 26).',
        cost: 45,
        order: 0,
      },
    ],
  },
];
