import { Paintbrush, Container, PackageOpen, Users2, ShieldCheck, Code2, type LucideIcon } from 'lucide-react';

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const FEATURES: FeatureItem[] = [
  {
    id: 'customization',
    title: 'Full customization',
    description: 'Branding, theme, boot message, and competition settings — all from the admin console, no code edits.',
    icon: Paintbrush,
  },
  {
    id: 'docker',
    title: 'Docker from the start',
    description: 'One command to deploy. Separate dev and production compose files, health checks included.',
    icon: Container,
  },
  {
    id: 'packages',
    title: 'Portable challenge packages',
    description: 'A versioned zip format for challenges — import and export between instances in seconds.',
    icon: PackageOpen,
  },
  {
    id: 'teams',
    title: 'Teams & individuals',
    description: 'Invite-code teams or solo play, live standings either way.',
    icon: Users2,
  },
  {
    id: 'admin',
    title: 'A real admin console',
    description: 'Manage challenges, users, submissions, and a full audit log — no database shell required.',
    icon: ShieldCheck,
  },
  {
    id: 'open-source',
    title: 'Open source',
    description: 'MIT licensed. Inspect it, modify it, self-host it on your own terms.',
    icon: Code2,
  },
];
