import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { OSShell } from '@/os/OSShell';
import { useAuthStore } from '@/stores/authStore';
import { useSetupStore } from '@/stores/setupStore';
import { ADMIN_PREFIX } from '@/lib/apiClient';

const LandingPage = lazy(() => import('@/features/landing/LandingPage').then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('@/features/authentication/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() =>
  import('@/features/authentication/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const AdminLoginPage = lazy(() =>
  import('@/features/authentication/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })),
);
const ChallengesPage = lazy(() =>
  import('@/features/challenges/ChallengesPage').then((m) => ({ default: m.ChallengesPage })),
);
const ChallengeDetailPage = lazy(() =>
  import('@/features/challenges/ChallengeDetailPage').then((m) => ({ default: m.ChallengeDetailPage })),
);
const LeaderboardPage = lazy(() =>
  import('@/features/leaderboard/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })),
);
const WriteupsPage = lazy(() =>
  import('@/features/writeups/WriteupsPage').then((m) => ({ default: m.WriteupsPage })),
);
const WriteupDetailPage = lazy(() =>
  import('@/features/writeups/WriteupDetailPage').then((m) => ({ default: m.WriteupDetailPage })),
);
const PublicProfilePage = lazy(() =>
  import('@/features/profile/PublicProfilePage').then((m) => ({ default: m.PublicProfilePage })),
);
const NotFoundPage = lazy(() =>
  import('@/features/misc/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);
const SetupWizardPage = lazy(() =>
  import('@/features/setup/SetupWizardPage').then((m) => ({ default: m.SetupWizardPage })),
);
const DocsPage = lazy(() => import('@/features/docs/DocsPage').then((m) => ({ default: m.DocsPage })));
const PagesPage = lazy(() => import('@/features/pages/PagesPage').then((m) => ({ default: m.PagesPage })));

function PageFallback() {
  return <LoadingSpinner label="Loading..." className="min-h-[60vh]" />;
}

// Pre-/app-move bare paths — anyone who still has one of these bookmarked
// (or an old external link) gets redirected rather than 404ing: to the
// `/app`-prefixed equivalent if they're already authenticated, to `/login`
// otherwise (same as today).
const PROTECTED_PREFIXES = ['/dashboard', '/teams', '/admin', '/writeups/create'];
// `/writeups/:slug` (a public read) is handled by its own PublicApp route and
// never reaches this catch-all — anything shaped like `/writeups/<slug>/edit`
// that does reach it is always the auth-only editor, never a slug lookup.
const WRITEUP_EDIT_PATTERN = /^\/writeups\/[^/]+\/edit$/;

/**
 * Logged-out catch-all: a link to a protected page (shared, bookmarked, or
 * just stale) sends the visitor to login with `state.from` set, same as the
 * old RequireAuth guard did — so they land back where they meant to go
 * after authenticating. An already-authenticated visitor instead gets sent
 * straight to the `/app`-prefixed equivalent (e.g. a bookmark for the old
 * bare `/dashboard` now goes to `/app/dashboard`) rather than seeing a 404.
 * A genuinely unknown path still 404s either way.
 *
 * `/profile` (the viewer's own private profile) is protected, but
 * `/profile/:username` (anyone's public profile) is not — same split as
 * `/writeups/create` vs `/writeups/:slug` above, so it's checked as an
 * exact match rather than folded into the prefix list (a startsWith check
 * would otherwise also protect the public sub-route).
 */
function PublicCatchAll() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isProtected =
    location.pathname === '/profile' ||
    PROTECTED_PREFIXES.some((p) => location.pathname.startsWith(p)) ||
    WRITEUP_EDIT_PATTERN.test(location.pathname);
  if (isProtected) {
    if (isAuthenticated) {
      return <Navigate to={`/app${location.pathname}`} replace />;
    }
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <NotFoundPage />;
}

/**
 * The entire authenticated app lives under ONE `<Route element={<OSShell/>}>`
 * layout route — every player/admin path is a sibling leaf (rendering
 * `null`; OSShell resolves window content from the URL itself, not via
 * Outlet). This is deliberate: OSShell must mount exactly once per session.
 * Earlier this was split across multiple route branches (one per auth
 * guard, plus separate dual-purpose routes for /challenges etc.), which
 * meant React tore down and rebuilt the whole desktop — every window, the
 * dock, the top bar — on every navigation that crossed a branch boundary,
 * e.g. Dashboard -> Explore. A single shared layout route fixes that.
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

function PublicApp() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/challenges" element={<ChallengesPage />} />
        <Route path="/challenges/:id" element={<ChallengeDetailPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/writeups" element={<WriteupsPage />} />
        <Route path="/writeups/:slug" element={<WriteupDetailPage />} />
        <Route path="/profile/:username" element={<PublicProfilePage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/docs/:slug" element={<DocsPage />} />
        <Route path="/pages" element={<PagesPage />} />
        <Route path="/pages/:slug" element={<PagesPage />} />
      </Route>

      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      {/* Deliberately not linked from anywhere in the UI — see
          AdminLoginPage's own comment for why. */}
      <Route path={`/${ADMIN_PREFIX}/login`} element={<AdminLoginPage />} />

      {/* Static "create" beats the dynamic "/writeups/:slug" route above
          regardless of declaration order — registered explicitly anyway so
          it's obvious this is deliberate, not an accident of route ranking. */}
      <Route path="/writeups/create" element={<PublicCatchAll />} />

      <Route path="*" element={<PublicCatchAll />} />
    </Routes>
  );
}

/**
 * The authenticated OS lives under `/app/*`; everything else is the
 * public site (marketing, docs, auth pages, and public reads of
 * challenges/leaderboard/writeups/profiles — identical whether or not
 * the viewer happens to be logged in). This is a path check, not an auth
 * check — `PublicApp` stays mounted for authenticated visitors too at
 * bare paths like `/challenges`; reaching the OS is deliberate, via `/app`.
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
