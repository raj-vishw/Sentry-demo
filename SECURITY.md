# Security

This is a **public demo deployment**, not a production CTF platform
instance. It is not suitable for hosting a real competition or storing
anything sensitive, and that's by design, not an oversight. This page
explains what's actually mitigated, what's accepted as an open trade-off
specific to being a demo, and how to report a vulnerability.

## Isolation from any other Sentry deployment

- Own MongoDB, own `JWT_SECRET`/`JWT_REFRESH_SECRET`, own file storage
  volume, own `ADMIN_ROUTE_PREFIX`. Nothing here is shared with the main
  Sentry repository or any other deployment of it.
- `server/src/config/isolationGuard.ts` refuses to boot, seed, or reset
  if `MONGODB_URI` matches a pattern that looks like a managed/production
  connection string, or if `DEMO_DB_CONFIRMATION` isn't set to its one
  required value — a deliberate "did you mean to point this at a
  throwaway database" check, run before every database connection.

## Why the published demo-admin account is safe to publish

The admin console (every route under `/api/v1/<ADMIN_ROUTE_PREFIX>/...`)
is the same, unmodified code as the main Sentry repository's admin
console — no new restriction logic was added for this demo, because none
was needed:

- **No remote code execution, shell access, or host-level control exists
  anywhere in the admin console.** The "interactive challenge environment"
  fields are metadata only; the only runtime implementation always
  returns a `FAILED` status with an honest "not available" message — no
  container is ever built, pulled, or run by this codebase.
- File upload/download/delete always use server-generated filenames,
  never a client-supplied path — there is no path-traversal surface to
  restrict further.
- The admin-admin's blast radius is therefore bounded entirely by this
  demo's own isolated database and its own isolated uploads volume —
  there is no other tenant, no real user data, and nothing outside this
  one deployment for a compromised or misused admin account to reach.

**Accepted operational trade-offs, by design, not bugs:**

- Anyone with the published demo-admin credentials can flip
  `maintenanceMode` on, which takes the entire public demo offline for
  every visitor until it's flipped back (or the demo is reset). If the
  demo appears down, this may be why — `./scripts/reset-demo.sh` restores
  it.
- The demo-admin can create, edit, or delete any challenge, user, or team
  in this database. Expected — that's exactly what periodic resets exist
  to undo.
- CSV export (users/submissions) only ever exposes this demo's own seeded
  fictional data — there is no real user data in this database to leak.
- Rate limiting (login, registration, flag submission, team-join) applies
  identically to every account, including the demo-admin — not relaxed
  for this deployment.

## What is and isn't real here

- Flags are bcrypt-hashed and never returned by any API response, exactly
  as in the main Sentry repository.
- Duplicate-solve protection is a database-level unique index, not just
  an application check — survives a race condition.
- All 15 seeded challenges are `STATIC` — solvable entirely from the text
  provided, no live service to attack. No `INTERACTIVE`/`HYBRID`
  challenge is seeded here, because this codebase cannot actually run one
  yet (see docs/about-this-demo.md) — this demo never claims otherwise.

## Reporting a vulnerability

If you find a genuine security issue in the underlying Sentry platform
(not "the demo-admin password is published," which is intentional — see
above), please report it privately to the main project rather than in a
public issue: <https://github.com/raj-vishw/Sentry/security/advisories>.

Do not submit a live, unredacted exploit against this running demo
instance in a public report — this demo's own data is disposable and
resettable, so there's no need to demonstrate impact against it directly.
