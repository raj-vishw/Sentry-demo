# Sentry OS — CTF Platform Frontend

A production-grade frontend for a competitive cybersecurity challenge
platform, connected end-to-end to a real backend (`../server`): auth, RBAC,
challenges, submissions, hints, profile, teams, and the leaderboard.

## Overview

Sentry lets operators solve security challenges across eight categories
(web, crypto, forensics, reverse engineering, pwn, OSINT, cloud, mobile),
earn XP, climb a leaderboard, and compete solo or as a team. There are
exactly two roles: `user` and `admin`.

The authenticated experience isn't a conventional page-by-page web app — it
presents as **Sentry OS**, a desktop operating system: a boot sequence,
draggable/resizable windows, a dock, a top bar, workspaces, and a Ctrl+K
command palette, all running over the real app underneath. Logged-out pages
(landing, login, register) and the two routes that work both logged-in and
-out (`/challenges`, `/leaderboard`) remain conventional pages.

Every feature area — auth, challenges, submissions, hints, profile,
dashboard, teams, leaderboard, and real challenge CRUD in admin — is backed
by the real API (`src/services/*` → `../server`). See
`../server/README.md` "What's Out of Scope for Phase 3" for the handful of
things still deliberately deferred (activity history, a notifications
backend, public profile pages, a couple of others).

## Tech Stack

- **React 19** + **TypeScript** (strict)
- **Vite** — build tool and dev server (proxies `/api` to the backend)
- **Tailwind CSS v4** — CSS-first theme via `@theme` tokens, plus container
  queries (`@container`/`@sm:`/`@lg:`) so components reflow correctly
  whether they're a full page or a resizable OS window
- **React Router** — routing, nested layouts; the authenticated tree is a
  single layout route so the OS shell mounts once per session (see below)
- **Framer Motion** — animation
- **TanStack Query** — server-state fetching/caching, centralized error handling
- **Zustand** — global state: `authStore`/`uiStore` (app-level) and the OS's
  own `windowStore`/`settingsStore`/`notificationStore`
- **React Hook Form + Zod** — form state and validation
- **Recharts** — admin analytics charts
- **Lucide React** — icon set
- **Vitest + Testing Library** — unit/component tests

No graph-layout library, no WebGL/Three.js, and no new animation framework
were added for the OS UI — the window manager, graph visualizations, and
particle background are all hand-rolled on the stack above, deliberately,
to avoid unnecessary dependency weight.

## Architecture

```
src/
├── app/               # router, providers (incl. session restoration), site-wide config
├── os/                 # the Sentry OS desktop shell (see "The OS Shell" below)
│   ├── OSShell.tsx       root: boot screen, top bar, desktop, windows, dock
│   ├── apps/             app registry + each app's content component
│   ├── components/       Window, WindowManager, Desktop, TopBar, BottomDock,
│   │                     ContextMenu, NotificationCenter, Clock, BootScreen
│   ├── state/            windowStore, settingsStore, notificationStore (Zustand)
│   └── lib/              resolveApp.ts — maps a URL to the app/window it represents
├── components/         # design-system primitives, shared across features
│   ├── ui/              Button, Input, Card, Modal, Table, GlassPanel, ThemeToggle, ...
│   ├── layout/           PublicLayout, AuthLayout, PageContainer, Footer
│   ├── navigation/       PublicNavbar, Logo (the OS replaces the old player/admin shells)
│   ├── animation/        AnimatedBackground, OrbitalRings, FadeIn, variants
│   └── feedback/         Toaster, EmptyState, ErrorState, ObservatoryLoader, Skeleton
├── features/           one folder per product area, each with its own hooks/
│   ├── landing/          public marketing page + sections
│   ├── authentication/   login/register + auth-only primitives
│   ├── dashboard/        player dashboard — the "Observatory" knowledge graph
│   ├── challenges/       explorer + the "Glass Laboratory" workspace + flag submission + hints
│   ├── leaderboard/      global/weekly/monthly + team rankings (real)
│   ├── teams/            team hub: create/join, members, category coverage, owner controls (real)
│   ├── profile/          account/profile page
│   ├── search/           Ctrl+K command palette (challenges, concepts, OS apps)
│   └── admin/            operations-center UI + real challenge/team visibility
├── services/           API layer — every service talks to the real backend
├── lib/                apiClient (fetch wrapper, auth headers, silent refresh), queryClient, utils
├── stores/             Zustand stores (in-memory auth session, UI state/toasts)
├── hooks/              reusable hooks (media queries, reduced motion, localStorage state)
├── types/               shared TypeScript types
└── styles/              design tokens (dark + light) + global CSS
```

## The OS Shell

The entire authenticated app lives under **one** `<Route element={<OSShell/>}>`
layout route in `app/router/index.tsx` — every player/admin path (`/dashboard`,
`/challenges`, `/challenges/:id`, `/leaderboard`, `/teams`, `/profile`,
`/admin/*`) is a sibling leaf rendering `null`. `OSShell` doesn't use
`<Outlet/>` at all; it resolves window content from the current URL itself
via `os/lib/resolveApp.ts`.

This is deliberate, not incidental: `OSShell` (and everything inside it —
every open window, the dock, the top bar) must mount **exactly once** per
authenticated session. An earlier version split the authenticated tree
across multiple route branches (one per auth guard, plus separate routes
for the pages reachable both logged-in and -out), which meant React tore
down and rebuilt the entire desktop on every navigation that crossed a
branch boundary — e.g. Dashboard → Explore flickered the whole UI. A single
shared layout route fixes that permanently.

**Apps** (`os/apps/registry.tsx`) map an app id to a title, icon, default
window size, and a content component — most are the *same* page components
used in the Phase 1/2/3 page-based UI (`DashboardPage`, `ChallengesPage`,
`TeamsPage`, ...), just rendered inside window chrome instead of a full
page. A few (`Notes`, `Files`, `Settings`, `Task Manager`) are OS-only
utilities with no page equivalent. Route-bound apps (`routePattern`) sync
with the browser URL both ways: navigating updates/focuses the right
window, and closing a window that matches the current URL navigates away.

**Window manager** (`os/components/Window.tsx`): drag via pointer events,
8-direction resize, edge/corner snap with a preview, minimize/maximize/
close, a real right-click context menu (minimize/maximize/close/move to
workspace), and a `ResizeObserver`-driven `isCompact` flag passed to window
content so it can reflow by actual window width rather than guessing from
the viewport. Layout (open windows, positions, sizes) persists to
localStorage (`os:windows:v2`) and is versioned — bump the version string if
you ever change the persisted shape, so stale localStorage data from an
older build doesn't get force-fit into it.

**Stacking order** is a single source of truth across the whole app, not
just the OS — windows occupy `z-[100, 100+N]` (bounded by live window count,
not an ever-growing counter), with global overlays layered above:
dock/top bar `500` → toasts `520` → modals `560` → notifications `550` →
command palette `600` → the challenge-completion overlay `650` → context
menus `700` → boot screen `999`.

## Theming

Dark and light themes are both complete — `styles/tokens.css` defines dark
as the `:root` default and light under `:root[data-theme='light']` (same
custom properties, different values, not a parallel token system). The
light palette deliberately **deepens** the accent colors rather than reusing
the vivid dark-mode ones, since the saturated versions fail contrast as
text/icons on a white background.

`<html data-theme>` and `<html data-density>` (comfortable/compact) are set
synchronously in `main.tsx` before the first paint (not in a `useEffect`) to
avoid a flash of the wrong theme, since Zustand's `persist` middleware
hydrates from localStorage synchronously. `app/providers/AppProviders.tsx`'s
`PreferenceSync` keeps them in sync afterward. Toggle either from the
Settings app, or theme alone from the `ThemeToggle` in the public navbar.

## A Zustand gotcha worth knowing

A selector that **constructs a new object/array/Set on every call** (e.g.
`useStore((s) => new Set(s.items.map(...)))`) makes the store look like it
changes on every render — triggering another render, calling the selector
again, forever (`"Maximum update depth exceeded"`). Select the underlying
stable reference (e.g. the raw array) and derive the computed value with
`useMemo` in the component instead. This has bitten this codebase twice
(`TopBar.tsx`, `FilesApp.tsx`) — both fixed, but worth knowing before adding
a new derived selector.

## Talking to the Backend

`vite.config.ts` proxies `/api/*` to the backend (`http://localhost:4000`
by default, overridable via `VITE_API_PROXY_TARGET` — see
`docker-compose.yml`). This makes the browser treat the API as same-origin,
which is what lets the HttpOnly refresh-token cookie work with
`SameSite=Lax` in development without HTTPS. See
`../server/README.md` "Authentication Architecture" for the full design
(short-lived in-memory access token + rotating HttpOnly refresh cookie).

`src/lib/apiClient.ts` is the only thing that calls `fetch`. It attaches
the access token, retries once via silent refresh on a 401, and normalizes
every error into an `ApiError` with a `status`/`code`. `src/lib/queryClient.ts`
wires a `QueryCache`/`MutationCache` `onError` that turns 403/429/5xx/network
errors into toasts centrally — 400/401/404 are left to individual
pages/forms, which already show inline errors for those.

If you hit a CORS error in development, check that `CLIENT_URL` in
`server/.env` includes whichever port Vite actually landed on — it falls
back to `5174`, `5175`, etc. whenever `5173` is already taken by another
running instance, and the backend only trusts origins explicitly listed
there.

## Design System

- **Color**: dark by default (near-black surfaces, one signal-cyan accent,
  one discovery-violet accent, used sparingly), with a complete light theme
  — see "Theming" above. All tokens live in
  [`src/styles/tokens.css`](src/styles/tokens.css) — change a value there to
  re-theme the whole app in both modes at once.
- **Typography**: Space Grotesk for display/headings, Inter for UI text,
  JetBrains Mono for flags, technical metadata, and system status.
- **Glass**: `.glass-panel`/`.glass-panel-strong` (see `GlassPanel.tsx`) are
  the shared translucent-surface primitive. Window content itself is
  deliberately **opaque**, not glass — stacking a second `backdrop-filter`
  on top of the window's own would blur an already-blurred layer into mud.
- **Motion**: Framer Motion variants in `components/animation/variants.ts`;
  everything respects `prefers-reduced-motion` (including the OS's own
  `reduceMotion` setting, which layers on top of the OS-level media query —
  see `hooks/useMediaQuery.ts`).

## Development Setup

Needs the backend running too (see `../server/README.md`, or just run
`docker compose up` from the repo root, which starts everything including
MongoDB):

```bash
npm install
npm run dev      # http://localhost:5173 — proxies /api to :4000
```

### Getting an account

Registration is real — create an account via `/register`, or seed dev data:
from `../server`, run `npm run seed` (creates a dev admin plus sample
users/challenges; the generated login is printed to the console on every
run — see `server/src/scripts/seed.ts`, never for production).

## Scripts

| Script                 | Description                          |
| ----------------------- | ------------------------------------ |
| `npm run dev`           | Start the Vite dev server            |
| `npm run build`         | Type-check and build for production  |
| `npm run preview`       | Preview the production build         |
| `npm run lint`          | Lint with oxlint                     |
| `npm run format`        | Format the codebase with Prettier    |
| `npm run format:check`  | Check formatting without writing     |
| `npm run test`          | Run the test suite once              |
| `npm run test:watch`    | Run tests in watch mode              |

## Environment Variables

None required to run the dev server against a local backend — see
[`.env.example`](.env.example). `VITE_API_PROXY_TARGET` (used by
`vite.config.ts`, not read by app code) points the dev proxy at a
non-default backend URL, e.g. inside Docker Compose.

## What's Next

See the root `README.md` "Status" and `../server/README.md` "What's Out of
Scope for Phase 3" for the current, authoritative list of deferred work
(activity history, a notifications backend, public profile pages, an
aggregated dashboard endpoint, competition draft/live/ended states).
