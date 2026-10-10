import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { OSShell } from '@/os/OSShell';
import { useAuthStore } from '@/stores/authStore';
import { useSetupStore } from '@/stores/setupStore';
import { ADMIN_PREFIX } from '@/lib/apiClient';

const LoginPage = lazy(() => import('@/features/authentication/LoginPage').then((m) => ({ default: m.LoginPage })));
const AdminLoginPage = lazy(() =>
  import('@/features/authentication/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })),
);
const SetupWizardPage = lazy(() =>
  import('@/features/setup/SetupWizardPage').then((m) => ({ default: m.SetupWizardPage })),
);

function PageFallback() {
  return <LoadingSpinner label="Loading..." className="min-h-[60vh]" />;
}

/**
 * The entire authenticated app lives under ONE `<Route element={<OSShell/>}>`
 * layout route — every player/admin path is a sibling leaf (rendering
 * `null`; OSShell resolves window content from the URL itself, not via
 * Outlet). This is deliberate: OSShell must mount exactly once per session.
 *
 * The `/admin/*` routes are registered unconditionally (not gated by role
 * here) so a non-admin's direct visit opens the Admin Console window and
 * sees a clear "Access Denied" message (enforced inside AdminConsoleApp)
 * instead of silently bouncing to the dashboard. The backend is the real
 * authority either way — every admin API call is independently gated.
 */
// Every OS-addressable path, mounted under the `/app` prefix.
const APP_ROUTE_SUFFIXES = [
  '/dashboard',
  '/challenges',
  '/challenges/:id',
  '/leaderboard',
  '/teams',
  '/profile',
  '/profile/:username',
  '/writeups',
  '/writeups/create',
  '/writeups/:slug',
  '/writeups/:slug/edit',
  '/admin',
  '/admin/challenges',
  '/admin/users',
  '/admin/teams',
  '/admin/submissions',
  '/admin/categories',
  '/admin/writeups',
  '/admin/statistics',
  '/admin/audit-logs',
  '/admin/settings',
  '/admin/competition',
];

function AuthenticatedApp() {
  return (
    <Routes>
      <Route element={<OSShell />}>
        {APP_ROUTE_SUFFIXES.map((suffix) => (
          <Route key={suffix} path={`/app${suffix}`} element={null} />
        ))}
        {/* Unregistered path under /app -> the desktop. */}
        <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

/**
 * This demo deliberately has no public marketing site, no self-serve
 * registration, and no logged-out browsing of challenges/leaderboard/
 * writeups/docs — the main Sentry repo has all of that; this demo's only
 * job is to show the real, authenticated product. So the entire
 * unauthenticated surface is just two pages: the public login (with
 * one-click demo-account buttons) and the hidden admin-login route it
 * calls under the hood for the admin demo account. Every other path
 * bounces: to `/login` if logged out, to the equivalent `/app/...` path
 * if already logged in (so a stale bookmark or direct link still lands
 * somewhere sensible instead of 404ing).
 */
function PublicApp() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Deliberately not linked from the UI except via LoginPage's own
          "Login as admin" button — see AdminLoginPage's own comment. */}
      <Route path={`/${ADMIN_PREFIX}/login`} element={<AdminLoginPage />} />
      <Route
        path="*"
        element={
          isAuthenticated ? (
            <Navigate to={`/app${location.pathname}`} replace />
          ) : (
            <Navigate to="/login" replace state={{ from: location }} />
          )
        }
      />
    </Routes>
  );
}

/**
 * The authenticated OS lives under `/app/*`; everything else is just the
 * login page (see `PublicApp`'s own comment for why). This is a path
 * check, not an auth check.
 */
function isAppPath(pathname: string): boolean {
  return pathname === '/app' || pathname.startsWith('/app/');
}

export function AppRouter() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const needsSetup = useSetupStore((s) => s.needsSetup);
  const location = useLocation();

  if (needsSetup) {
    return (
      <Suspense fallback={<PageFallback />}>
        <SetupWizardPage />
      </Suspense>
    );
  }

  const underAppPrefix = isAppPath(location.pathname);

  if (underAppPrefix && !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <Suspense fallback={<PageFallback />}>
      {underAppPrefix ? <AuthenticatedApp /> : <PublicApp />}
    </Suspense>
  );
}
