# Sentry — Backend

Production-oriented Express + TypeScript + MongoDB backend for the Sentry
CTF platform: authentication, RBAC, challenge management, the flag
submission/scoring engine, teams, and the leaderboard.

## Tech Stack

Node.js, Express 5, TypeScript, Mongoose (MongoDB), Zod, JWT, bcrypt,
Helmet, CORS, express-rate-limit, Pino (structured logging), Multer (file
uploads), Vitest + Supertest + mongodb-memory-server (tests).

## Architecture

```
src/
├── config/       env validation, database connection, security (CORS/Helmet), uploads
├── controllers/  thin HTTP layer — parse request, call a service, send response
├── services/     all business logic lives here
├── models/       Mongoose schemas (User, Category, Challenge, Hint, Submission, Team)
├── routes/       route wiring + which middleware guards which endpoint
├── middleware/   auth, RBAC, validation, rate limiting, centralized error handling
├── validators/   Zod schemas — the backend's authoritative validation
├── utils/        jwt, password/flag hashing, errors, response shape, logger
├── scripts/      seed.ts (development-only data)
├── app.ts        Express app assembly (no listening)
└── server.ts     boot: connect DB, listen, graceful shutdown
```

Controllers never touch Mongoose directly — that's the services' job — and
services never touch `req`/`res`. This keeps the business logic (and its
tests) independent of HTTP.

## Authentication Architecture

Short-lived **access token** (JWT, default 15m) + long-lived **refresh
token** (JWT, default 7d) with rotation:

- On login/register/refresh, the access token is returned **in the JSON
  body only**. The frontend keeps it in memory (a Zustand store that is
  explicitly *not* persisted to localStorage) and attaches it as
  `Authorization: Bearer <token>`. It is never written to localStorage,
  a cookie, or anywhere else — that's what keeps it inaccessible to an XSS
  payload.
- The refresh token is set as an **HttpOnly cookie**, scoped to
  `/api/v1/auth`, `Secure` in production, `SameSite=Lax`. Being HttpOnly
  means frontend JavaScript can never read it, only the browser can send it
  back automatically to the refresh/logout endpoints.
- **Rotation**: every user has a `tokenVersion` counter. A refresh token
  embeds the version it was issued with. `POST /auth/refresh` checks the
  version matches, then *increments* it and issues a new pair — so the
  refresh token just used can never be replayed again. Logout also
  increments the version, invalidating every outstanding refresh token
  immediately (effectively a server-side session kill switch, without
  needing a token blocklist).
- **Session restoration**: on app load, the frontend calls `POST
  /auth/refresh` once (the cookie is sent automatically) to silently obtain
  a fresh access token if a valid session cookie exists, otherwise the user
  is simply logged out.

### Why not just localStorage for everything?

A token in localStorage is readable by any script running on the page —
one dependency with an XSS bug and every session is compromised. Keeping
the access token in memory and the refresh token in an HttpOnly cookie
means an XSS payload can, at worst, use the app as the logged-in user while
the tab is open; it cannot exfiltrate a long-lived credential.

### Dev/prod cookie note

The client dev server proxies `/api` to this backend (see
`client/vite.config.ts`), so the browser sees them as the same origin and
`SameSite=Lax` cookies work without needing `Secure`/HTTPS locally. In
production, deploy behind the same reverse-proxy pattern (frontend and
`/api` on one origin) so this continues to hold; if you ever split them
across real origins, switch to `SameSite=None; Secure` and serve both over
HTTPS.

## Flag Security

- Flags are **never** stored in plaintext — only a bcrypt hash
  (`Challenge.flagHash`, `select: false` so it's excluded from every query
  by default, including the admin edit-form fetch).
- The flag is never present in any API response, ever — not on create, not
  on the admin edit form (which can only *replace* the flag, never read
  it), not on the public challenge detail endpoint.
- A submitted flag is compared with `bcrypt.compare` (constant-time) and
  otherwise only ever touches a one-way SHA-256 audit digest
  (`Submission.submittedFlagHash`) — the plaintext guess is never persisted.
- Wrong-flag responses are deliberately generic (`"Incorrect flag."`) and
  never hint at partial correctness.

## Duplicate-Solve & Race-Condition Safety

`Submission` has a **unique partial index** on `{ user, challenge }` where
`correct: true`. The application also checks "already solved" before
awarding points, but the index is the actual guarantee: if two correct
submissions from the same user ever race each other, MongoDB itself rejects
the second insert, and that request is told "already solved" instead of
double-awarding points. See `models/Submission.ts` and
`services/submission.service.ts`.

## Team Scoring Model

A team's points/solved-count are **never stored**. `GET /teams/:slug` (and
the team leaderboard) compute them live from current members' own
(server-authoritative) `User.points`/`solvedChallenges` every time they're
read — see `services/team.service.ts#computeMembersAndStats`. There is no
`team.points` field a client (or a bug) could desync from reality, and nothing
to race: the submission flow (`submission.service.ts`) never touches a team
document at all.

This also defines the scoring rule precisely: a team's total is the **sum of
its current members' lifetime points**. If someone leaves, their
contribution leaves with them. If two members both solved the same
challenge, both their individual awards count toward the team total (there
is no shared "first blood" mechanic) — but the team's category *coverage*
(shown on its detail page) counts each challenge once, as the union of
everything any current member has solved.

Team membership itself (`members: [{ user, role, joinedAt }]`, `owner`,
`inviteCode`) is the only team state that's genuinely stored and mutated —
join/leave/remove/transfer all go through `team.service.ts`, which enforces
capacity (`MAX_TEAM_MEMBERS`), ownership checks, and the auto-succession
rule (if an owner leaves and teammates remain, the earliest-joined one
becomes owner; if they were the last member, the team is deleted).

## Leaderboard Ranking Strategy

Documented once here rather than left implicit — `services/leaderboard.service.ts`:

- **Primary key**: points, descending (lifetime `User.points` for the
  `global` scope; points earned *within the window* — summed from the
  `Submission` log — for `weekly`/`monthly`, since lifetime points aren't
  meaningful for a time-boxed scope).
- **Tiebreak**: earlier `createdAt` wins — account-creation time for
  `global`, first solve inside the window for `weekly`/`monthly`. This makes
  every rank fully deterministic; nobody ever shares a rank number.
- Ranks are assigned by sorting the **entire** matching set in one
  aggregation before pagination, so "your rank" is always correct even when
  you're off the visible page (`me.onPage: false` in the response) — it's
  never approximated from just the current page.
- The same approach (sum of members' points, same tiebreak via team
  creation order) ranks the team leaderboard (`GET /leaderboard/teams`).

MongoDB's native rank window operators (`$rank`/`$denseRank`/`$documentNumber`)
only accept a **single-field** `sortBy`, which can't express "points desc,
then earlier timestamp" in one expression. Instead, the full ranking is
built with a plain multi-field `$sort` followed by collapsing the ordered
set into one document and re-expanding it with `$unwind`'s
`includeArrayIndex` as the rank (see `withSequentialRank` in
`leaderboard.service.ts`) — the standard way to get a fully custom,
deterministic sequential rank out of an aggregation pipeline.

## Deletion Strategy (Challenges)

Deleting a challenge is a **hard delete** of the `Challenge` document and
its `Hint` documents, plus removal of its uploaded files from disk.
**Submissions are deliberately left in place** — they're an audit/abuse
log, not a live reference that needs to stay consistent with the challenge
catalog, and preserving them keeps historical analytics and audit trails
intact even after a challenge is retired. A dangling `Submission.challenge`
reference is an acceptable, documented trade-off; it is never treated as
"live" data.

## Admin Accounts

There is no public way to become an ADMIN through the normal registration
endpoint — it always creates a `USER`, and the role is never read from the
request body (see `services/auth.service.ts`).

**The first admin on a real deployment is created through the first-run
setup wizard**, not a script: `GET /api/v1/setup/status` reports whether
any admin has been created yet, and `POST /api/v1/setup/initialize` creates
exactly one (atomically — see `services/setup.service.ts` for how it
guards against being run twice). The frontend shows this automatically as
a full-page wizard in place of the login page until it's been completed.
See [`docs/deployment/self-hosting.md`](../docs/deployment/self-hosting.md).

For local development only, `npm run seed` creates an additional, obvious,
printed-to-console dev admin + sample users/challenges — this is a
separate path from the setup wizard and should never be run against a real
deployment's database.

## API Response Shape

```jsonc
// success
{ "success": true, "data": { ... } }
// error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

Error `code`s: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN`
(403), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429),
`INTERNAL_ERROR` (500).

### Gotcha: validating query params on Express 5

`middleware/validation.middleware.ts#validate` is shared across
body/params/query. Express 5 exposes `req.query` as a **getter-only**
accessor, so the naive `req.query = parsed` (fine for body/params) throws
`Cannot set property query of #<IncomingMessage> which has only a getter`.
The fix is `Object.defineProperty(req, 'query', { value, writable: true,
configurable: true })` instead of a plain assignment — already handled
inside `validate()`, but worth knowing if you ever rewrite it.

## Development Setup

```bash
cp .env.example .env      # fill in real secrets, incl. SEED_ADMIN_PASSWORD/SEED_USER_PASSWORD
npm install
npm run seed               # optional: dev admin + sample users/challenges
npm run dev                 # http://localhost:4000
```

Requires a running MongoDB reachable at `MONGODB_URI` (see
`docker-compose.yml` at the repo root for a one-command local Mongo, or run
your own). The automated test suite does **not** need this — it boots its
own isolated in-memory MongoDB per test file via `mongodb-memory-server`.

`npm run seed` reads its admin/sample-user passwords from
`SEED_ADMIN_PASSWORD`/`SEED_USER_PASSWORD` (see `.env.example`) — never
hardcoded in the script — and refuses to run if they're unset. **It also
wipes every collection before reseeding**, so only ever point it at a
disposable local/dev database, never anything with real data.

## Scripts

| Script            | Description                                    |
| ------------------ | ----------------------------------------------- |
| `npm run dev`       | Start the API with hot reload (tsx watch)       |
| `npm run build`     | Type-check and compile to `dist/`               |
| `npm start`         | Run the compiled build                          |
| `npm run seed`      | Reset and seed development data                 |
| `npm test`          | Run the backend test suite once                 |
| `npm run test:watch`| Run tests in watch mode                         |
| `npm run lint`      | Type-check without emitting (`tsc --noEmit`)    |

## Testing

64 tests across authentication, RBAC, challenge CRUD/publishing, challenge
search/filter/sort/pagination, flag submission
(correct/incorrect/duplicate/points), the rate-limit mechanism, teams
(create/join/leave/ownership-succession/full-team/authorization), and the
leaderboard (ranking order, pagination, off-page "your position", team
rankings). Each test file boots an isolated in-memory MongoDB instance —
nothing touches a real database, and nothing needs Docker to run.

## What's Out of Scope for Phase 3

Documented here rather than left silently unfinished:

- **Activity history** (a per-user event feed: solves, team joins, hint
  uses) — no `Activity` model/endpoints yet. `User.solvedChallenges` and
  `Submission` already contain enough to backfill this later without a
  schema migration.
- **Notifications backend** — the frontend has a real notification center,
  but it's populated from client-side events only (e.g. a solve in the
  current tab), not a persisted, cross-session `Notification` collection.
- **Public profile pages** (`GET /users/:username`) — only `GET /users/me`
  (the caller's own profile) exists. Viewing another operator's profile
  isn't wired up yet.
- **A single aggregated dashboard endpoint** — the dashboard currently makes
  a small number of purpose-built requests (profile, recommended,
  recently-added) rather than one `/users/me/dashboard` that bundles them.
  Functionally equivalent; just not consolidated.
- **Competition states** (`DRAFT`/`UPCOMING`/`LIVE`/`ENDED`) — challenges are
  always "always-open"; no event/season abstraction exists yet.
- **Admin team management** — admins can view all teams (`AdminTeamsPage`,
  read-only) but there's no admin endpoint to edit/disband someone else's
  team; that's still owner-only via the player-facing team routes.
