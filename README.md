# Sentry Demo

A standalone, independently-deployable public demo of
[**Sentry**](https://github.com/raj-vishw/Sentry), an open-source,
self-hostable Capture The Flag platform. This is a **separate project**
from the main Sentry repository — its own codebase, its own database, its
own secrets, its own file storage — with no runtime dependency on any
other Sentry deployment. It exists to let people try Sentry OS and a
real, playable CTF without self-hosting first.

Intended to run at `https://demo.sentry.example` (placeholder domain —
see [Deployment checklist](#deployment-checklist) below for what actually
needs to happen before that's real).

## How this differs from the main Sentry repo

| | Main Sentry repo | sentry-demo |
|---|---|---|
| Purpose | Self-hosted CTF platform, any competition | A single, standing, public demo instance |
| Accounts | Self-serve registration + setup wizard | Two published, documented accounts; open registration also works |
| Challenges | You bring your own | 15 original, fictional, `STATIC`-only challenges, seeded |
| Admin console | Full, for your own operators | Full, but confined to this demo's own isolated database |
| Data lifecycle | Yours to manage | Resets on demand/schedule back to a known-good baseline |
| Interactive challenges | Data model/API exist, no runtime yet | Not used at all — every seeded challenge is `STATIC` |

Everything else — the Sentry OS desktop UI, authentication, challenge/
submission/scoring engine, teams, leaderboard, admin console — is the
same architecture as the main project, copied into this repo so it can be
deployed and operated completely independently. See [Architecture](#architecture).

## Demo accounts

These are **intentionally public, documented** credentials — not secrets.
Anyone can use them; don't treat anything you do here as private.

| Role | Username | Password | Email |
|---|---|---|---|
| Admin | `admin` | `admin` | `admin@sentry-demo.example` |
| Player | `user` | `user` | `user@sentry-demo.example` |

Deliberately simple and memorable — the whole point of a public demo is
that anyone can log in instantly without having to look up or copy a
credential. (These are fixed directly in both compose files; a bare-metal
run reads them from `server/.env.example`'s `DEMO_ADMIN_*`/`DEMO_USER_*`
variables, which a real redeployment under your own identities could
change.)

You can also register your own throwaway account — registration is open
by default, same as a fresh self-hosted Sentry instance.

## Architecture

```
sentry-demo/
├── client/     # React + TypeScript + Vite — the Sentry OS desktop UI
├── server/     # Express + TypeScript + MongoDB — API, auth, scoring
├── scripts/    # reset-demo.sh, backup.sh, restore.sh, healthcheck.mjs
├── docs/       # served by the in-app /docs browser (one page, about-this-demo.md)
├── docker-compose.yml               # dev stack
└── docker-compose.production.yml    # production-shaped stack
```

The server's challenge/seed data lives in
`server/src/scripts/seedData/` (not a top-level `seed/` folder) — kept
inside the server's own TypeScript project so the build tooling never has
to reach outside its `rootDir`.

## Local setup

```bash
cd server && npm install && cp .env.example .env   # fill in real values, see below
cd ../client && npm install && cp .env.example .env
```

Either way, `MONGODB_URI` must point at a dedicated cluster for this demo
— a local MongoDB is fine for quick local testing, but there's no bundled
`mongodb` container in either compose file; a dedicated external Atlas
(or other managed) cluster is the intended setup. If using
`mongodb+srv://`, include an explicit database name in the path (e.g.
`/sentry-demo`) or the driver silently defaults to Atlas's own `test`
database.

Then either run both dev servers directly (`npm run dev` in each
directory), or use the dev Docker Compose stack (reads `MONGODB_URI`
from a root-level `.env` — see `.env.example`):

```bash
cp .env.example .env   # set MONGODB_URI
docker compose up --build -d
docker compose exec backend npm run seed:demo
```

Frontend: <http://localhost:5174> · Backend: <http://localhost:4001>

## Environment variables

See `server/.env.example` and `client/.env.example` for the full,
commented list. The ones specific to this being a demo (not present in
the main Sentry repo):

| Variable | Where | Purpose |
|---|---|---|
| `DEMO_DB_CONFIRMATION` | `server/.env` | Must exactly equal `yes-this-is-the-demo-database` — a deliberate confirmation gate (not a secret) that the server and the seed/reset script both refuse to run without. See `server/src/config/isolationGuard.ts`. |
| `DEMO_ADMIN_USERNAME`/`_EMAIL`/`_PASSWORD` | `server/.env` | The published demo-admin account's identity. |
| `DEMO_USER_USERNAME`/`_EMAIL`/`_PASSWORD` | `server/.env` | The published demo-player account's identity. |

Every other variable (`MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
`CLIENT_URL`, `ADMIN_ROUTE_PREFIX`, `VITE_ADMIN_ROUTE_PREFIX`, ...) works
exactly as it does in the main Sentry repo — **but every value must be
freshly generated for this deployment, never copied from any other one**.
Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # JWT_SECRET / JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(8).toString('hex'))"    # ADMIN_ROUTE_PREFIX
```

## Seeding and resetting

One script does both — there's no "partial" seed mode, since this whole
database *is* the demo:

```bash
npm run seed:demo    # inside server/, or: docker compose exec backend npm run seed:demo
```

Wipes every collection and recreates: 5 categories, 15 challenges (3 each
across web/crypto/forensics/reverse-engineering/OSINT, all `STATIC`), the
2 published demo accounts, and default platform/competition branding.
Refuses to run unless `DEMO_DB_CONFIRMATION` is set correctly and
`MONGODB_URI` doesn't match a known-production-looking pattern — see
`server/src/config/isolationGuard.ts`.

To reset a running deployment:

```bash
./scripts/reset-demo.sh                                    # against docker-compose.production.yml
COMPOSE_FILE=docker-compose.yml ./scripts/reset-demo.sh     # against the dev stack
```

To reset on a schedule, wire it into cron yourself (no built-in
scheduler):

```cron
0 */6 * * * cd /path/to/sentry-demo && ./scripts/reset-demo.sh >> /var/log/sentry-demo-reset.log 2>&1
```

## Docker deployment

```bash
cp .env.example .env   # fill in real generated secrets — see above
docker compose -f docker-compose.production.yml up -d --build
docker compose -f docker-compose.production.yml exec backend npm run seed:demo
```

MongoDB is a dedicated external Atlas (or any managed/self-hosted)
cluster — there's no local `mongodb` container or volume in either
compose file. Uploaded-file storage lives in its own named Docker volume
(`sentry_demo_uploads_data`), independent from any other Sentry
deployment's volumes.

## Deployment checklist for a real domain

This repo does not provision DNS, TLS, or hosting — those need a real
domain and server, neither of which exist in a development environment.
Before going live at a real domain:

- [ ] Point a DNS A/AAAA (or CNAME) record at your server.
- [ ] Put a TLS-terminating reverse proxy (Caddy, Nginx + Certbot, etc.)
      in front of the `frontend` container's port `8080`.
- [ ] Set `CLIENT_URL` in `.env` to the real `https://` origin.
- [ ] Generate and set real, unique `JWT_SECRET`/`JWT_REFRESH_SECRET`/
      `ADMIN_ROUTE_PREFIX` values (never reuse any other deployment's).
- [ ] Decide a reset cadence and wire `scripts/reset-demo.sh` into cron.
- [ ] Read [SECURITY.md](SECURITY.md) in full before publishing the
      demo-admin credentials anywhere.

## Backing up / restoring

```bash
./scripts/backup.sh                          # -> backups/<timestamp>/
./scripts/restore.sh backups/<timestamp>     # destructive, asks for confirmation
```

Thin wrappers around `mongodump`/`mongorestore` and a volume tarball — no
automated off-host pipeline. Not that it matters much here: everything in
this database is disposable demo content, reproducible from
`npm run seed:demo`.

## Updating

```bash
git pull
docker compose -f docker-compose.production.yml up -d --build
```

## Troubleshooting

- **"Refusing to run" on boot or seed** — `DEMO_DB_CONFIRMATION` isn't
  set to exactly `yes-this-is-the-demo-database`, or `MONGODB_URI` looks
  like a production connection string. See
  `server/src/config/isolationGuard.ts`.
- **Admin console 404s** — `VITE_ADMIN_ROUTE_PREFIX` (client) and
  `ADMIN_ROUTE_PREFIX` (server) don't match.
- **CORS errors in the browser console** — `CLIENT_URL` doesn't match
  the origin you're actually visiting from.

## Known limitations

- **Window-drag snap-preview ghost may be offset by ~32px** during a
  window drag near the top of the screen — the permanent demo banner
  shifts the OS shell's real layout correctly, but the drag-preview
  overlay in `os/components/WindowManager.tsx` computes its position
  from raw `window.innerHeight`/`innerWidth` independent of that shift.
  Cosmetic only; it doesn't affect where a window actually lands.
- **Interactive challenges are not available** — see
  [docs/about-this-demo.md](docs/about-this-demo.md).
- **No automated secret rotation or scheduled reset** — both are
  documented manual procedures (above), not built-in features.

## License

MIT, same as the main Sentry project.
