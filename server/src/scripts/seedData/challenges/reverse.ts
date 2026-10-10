import type { DemoChallengeSpec } from '../types.js';
import { asciiCodes, xorHex, shiftedReversedBytes } from '../encodeUtils.js';

const STACK_FLAG = 'SENTRYDEMO{the_stack_remembers_everything}';
const stackBytes = asciiCodes(STACK_FLAG);

const OPCODE_FLAG = 'SENTRYDEMO{three_byte_keys_are_weak}';
const opcodeKey = 'rev';
const opcodeHex = xorHex(OPCODE_FLAG, opcodeKey);

const VM_FLAG = 'SENTRYDEMO{bytecode_vms_leak_their_math}';
const vmBytes = shiftedReversedBytes(VM_FLAG).join(', ');

export const reverseChallenges: DemoChallengeSpec[] = [
  {
    title: 'Stack Whisper',
    category: 'reverse',
    difficulty: 'EASY',
    points: 100,
    description:
      'A disassembler trace shows these byte values pushed onto the stack, in order, right before a `call print`:\n\n' +
      `\`${stackBytes}\`\n\n` +
      'Each value is a single ASCII character code.',
    flag: STACK_FLAG,
    hints: [{ title: 'Reading the stack', content: 'Convert each decimal number to its ASCII character, in the order given.', cost: 10, order: 0 }],
  },
  {
    title: 'Opcode Shuffle',
    category: 'reverse',
    difficulty: 'MEDIUM',
    points: 300,
    description:
      "A decompiled obfuscation routine XORs its input against a repeating key before output. The routine's output, hex-encoded:\n\n" +
      `\`${opcodeHex}\`\n\n` +
      `A strings dump of the binary's \`.data\` section reveals the embedded key: \`${opcodeKey}\`.`,
    flag: OPCODE_FLAG,
    hints: [{ title: 'Applying the key', content: 'Hex-decode the output, then XOR every byte against the repeating 3-byte key.', cost: 30, order: 0 }],
  },
  {
    title: 'Virtual Machine Trap',
    category: 'reverse',
    difficulty: 'HARD',
    points: 450,
    description:
      'A tiny custom bytecode VM runs two opcodes on its input before halting: `ADD 7` (per byte, mod 256) then `REV` ' +
      '(reverse the whole byte array). Its final output register holds:\n\n' +
      `\`${vmBytes}\`\n\n` +
      'Recover the original input bytes, then read them as ASCII.',
    flag: VM_FLAG,
    hints: [
      {
        title: 'Undoing the VM',
        content: 'Reverse the array order first (undoing REV), then subtract 7 mod 256 from every value (undoing ADD 7).',
        cost: 45,
        order: 0,
      },
    ],
  },
];
