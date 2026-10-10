import { lazy, Suspense, useState } from 'react';
import { ADMIN_NAV_LINKS } from '@/app/config/site';
import { NAV_ICON_MAP } from '@/lib/navIcons';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { ForbiddenPage } from '@/features/misc/ForbiddenPage';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import type { AppContentProps } from '../types';

const AdminDashboardPage = lazy(() =>
  import('@/features/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
);
const AdminChallengesPage = lazy(() =>
  import('@/features/admin/AdminChallengesPage').then((m) => ({ default: m.AdminChallengesPage })),
);
const AdminUsersPage = lazy(() =>
  import('@/features/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
);
const AdminTeamsPage = lazy(() =>
  import('@/features/admin/AdminTeamsPage').then((m) => ({ default: m.AdminTeamsPage })),
);
const AdminSubmissionsPage = lazy(() =>
  import('@/features/admin/AdminSubmissionsPage').then((m) => ({ default: m.AdminSubmissionsPage })),
);
const AdminStatisticsPage = lazy(() =>
  import('@/features/admin/AdminStatisticsPage').then((m) => ({ default: m.AdminStatisticsPage })),
);
const AdminCategoriesPage = lazy(() =>
  import('@/features/admin/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage })),
);
const AdminWriteupsPage = lazy(() =>
  import('@/features/admin/AdminWriteupsPage').then((m) => ({ default: m.AdminWriteupsPage })),
);
const AdminAuditLogPage = lazy(() =>
  import('@/features/admin/AdminAuditLogPage').then((m) => ({ default: m.AdminAuditLogPage })),
);
const AdminSettingsPage = lazy(() =>
  import('@/features/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })),
);
const AdminCompetitionPage = lazy(() =>
  import('@/features/admin/AdminCompetitionPage').then((m) => ({ default: m.AdminCompetitionPage })),
);
const AdminPagesPage = lazy(() =>
  import('@/features/admin/AdminPagesPage').then((m) => ({ default: m.AdminPagesPage })),
);
const AdminAnnouncementsPage = lazy(() =>
  import('@/features/admin/AdminAnnouncementsPage').then((m) => ({ default: m.AdminAnnouncementsPage })),
);

const SECTIONS: Record<string, React.ComponentType> = {
  '/app/admin': AdminDashboardPage,
  '/app/admin/challenges': AdminChallengesPage,
  '/app/admin/users': AdminUsersPage,
  '/app/admin/teams': AdminTeamsPage,
  '/app/admin/submissions': AdminSubmissionsPage,
  '/app/admin/categories': AdminCategoriesPage,
  '/app/admin/writeups': AdminWriteupsPage,
  '/app/admin/statistics': AdminStatisticsPage,
  '/app/admin/audit-logs': AdminAuditLogPage,
  '/app/admin/competition': AdminCompetitionPage,
  '/app/admin/pages': AdminPagesPage,
  '/app/admin/announcements': AdminAnnouncementsPage,
  '/app/admin/settings': AdminSettingsPage,
};

export function AdminConsoleApp({ params, isCompact }: AppContentProps) {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const initial = params.section && SECTIONS[params.section] ? params.section : '/app/admin';
  const [section, setSection] = useState(initial);
  const Section = SECTIONS[section] ?? AdminDashboardPage;

  // The window opens for any authenticated user who navigates here — role is
  // enforced here, not by hiding the route, so a direct URL visit by a
  // non-admin sees a clear message instead of silently bouncing elsewhere.
  // The backend remains the real authority: every API call this console
  // makes is independently gated by `requireRole('ADMIN')` regardless of
  // this check.
  if (!isAdmin) {
    return <ForbiddenPage message="The admin command center is restricted to ADMIN accounts." />;
  }

  return (
    <div className={cn('flex h-full min-h-0', isCompact ? 'flex-col' : 'flex-row')}>
      <nav
        className={cn(
          'flex shrink-0 gap-1 border-[var(--color-glass-border)] p-2',
          isCompact ? 'flex-row overflow-x-auto border-b' : 'w-52 flex-col border-r',
        )}
      >
        {ADMIN_NAV_LINKS.map((link) => {
          const Icon = NAV_ICON_MAP[link.icon];
          const isActive = link.href === section;
          return (
            <button
              key={link.href}
              type="button"
              onClick={() => setSection(link.href)}
              className={cn(
                'flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-[var(--radius-md)] px-3 py-2.5 text-left text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]',
              )}
            >
              {Icon && <Icon className="size-4" aria-hidden="true" />}
              {link.label}
            </button>
          );
        })}
      </nav>

      <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <Suspense fallback={<LoadingSpinner label="Loading..." className="min-h-[40vh]" />}>
          <Section />
        </Suspense>
      </div>
    </div>
  );
}
