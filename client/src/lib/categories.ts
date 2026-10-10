import {
  Globe,
  KeyRound,
  Fingerprint,
  Cpu,
  Terminal,
  Satellite,
  Cloud,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';
import type { Category } from '@/types';

export interface CategoryMeta {
  id: Category;
  name: string;
  description: string;
  icon: LucideIcon;
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  web: {
    id: 'web',
    name: 'Web',
    description: 'Exploit vulnerabilities in web applications and APIs.',
    icon: Globe,
  },
  crypto: {
    id: 'crypto',
    name: 'Crypto',
    description: 'Break ciphers, attack weak implementations, and decode secrets.',
    icon: KeyRound,
  },
  forensics: {
    id: 'forensics',
    name: 'Forensics',
    description: 'Recover evidence from disk images, memory dumps, and traffic.',
    icon: Fingerprint,
  },
  reverse: {
    id: 'reverse',
    name: 'Reverse Engineering',
    description: 'Disassemble binaries and reconstruct hidden logic.',
    icon: Cpu,
  },
  pwn: {
    id: 'pwn',
    name: 'Pwn',
    description: 'Exploit memory corruption to gain control of a process.',
    icon: Terminal,
  },
  osint: {
    id: 'osint',
    name: 'OSINT',
    description: 'Trace targets using publicly available information.',
    icon: Satellite,
  },
  cloud: {
    id: 'cloud',
    name: 'Cloud',
    description: 'Attack misconfigured cloud infrastructure and IAM.',
    icon: Cloud,
  },
  mobile: {
    id: 'mobile',
    name: 'Mobile',
    description: 'Reverse and exploit Android and iOS applications.',
    icon: Smartphone,
  },
};

export const CATEGORY_LIST: CategoryMeta[] = Object.values(CATEGORY_META);

export const DIFFICULTY_META = {
  easy: { label: 'Easy', color: 'var(--color-difficulty-easy)' },
  medium: { label: 'Medium', color: 'var(--color-difficulty-medium)' },
  hard: { label: 'Hard', color: 'var(--color-difficulty-hard)' },
  insane: { label: 'Insane', color: 'var(--color-difficulty-insane)' },
} as const;
