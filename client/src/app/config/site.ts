export const SITE_CONFIG = {
  name: 'Sentry',
  tagline: 'The self-hosted CTF platform.',
  description:
    'An open-source Capture The Flag platform you deploy on your own infrastructure — challenges, teams, scoring, and a full admin console, under your control.',
  githubUrl: '#', // TODO: replace with real repository URL
  socials: {
    twitter: '#', // TODO
    discord: '#', // TODO
  },
} as const;

export const PUBLIC_NAV_LINKS = [
  { label: 'Docs', href: '/docs' },
  { label: 'About', href: '/#about' },
] as const;

export const ADMIN_NAV_LINKS = [
  { label: 'Dashboard', href: '/app/admin', icon: 'LayoutDashboard' },
  { label: 'Challenges', href: '/app/admin/challenges', icon: 'Flag' },
  { label: 'Users', href: '/app/admin/users', icon: 'Users' },
  { label: 'Teams', href: '/app/admin/teams', icon: 'Shield' },
  { label: 'Submissions', href: '/app/admin/submissions', icon: 'ListChecks' },
  { label: 'Categories', href: '/app/admin/categories', icon: 'Layers' },
  { label: 'Writeups', href: '/app/admin/writeups', icon: 'FileText' },
  { label: 'Statistics', href: '/app/admin/statistics', icon: 'BarChart3' },
  { label: 'Audit Log', href: '/app/admin/audit-logs', icon: 'ScrollText' },
  { label: 'Competition', href: '/app/admin/competition', icon: 'Trophy' },
  { label: 'Pages', href: '/app/admin/pages', icon: 'BookOpen' },
  { label: 'Announcements', href: '/app/admin/announcements', icon: 'Megaphone' },
  { label: 'Settings', href: '/app/admin/settings', icon: 'Settings' },
] as const;
