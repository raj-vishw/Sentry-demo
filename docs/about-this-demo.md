# About this demo

This is **Sentry Demo** — a standalone, public demo deployment of
[Sentry](https://github.com/raj-vishw/Sentry), an open-source,
self-hostable Capture The Flag platform. It is a separate codebase and a
separate running instance: it has its own database, its own secrets, and
its own file storage, with no connection of any kind to any other Sentry
deployment.

## What's real here

Everything you can do is backed by a real, independent instance of the
same backend/frontend code as the main project: registering or logging
in with the published demo accounts, browsing and solving 15 original
challenges across five categories, earning points, climbing the
leaderboard, unlocking hints, and exploring the admin console as the
published demo-admin account. Scores and solve state come from this
demo's own database — nothing here is hardcoded or faked.

## What's not

- **Interactive/containerized challenges are not available.** Every
  challenge in this demo is `STATIC` (solve from the provided text,
  no live vulnerable service to attack). The underlying Sentry codebase
  has a real data model and API for interactive challenges, but no
  runtime that actually builds or runs a container yet — this demo
  doesn't pretend otherwise.
- **Data resets periodically.** Anyone with the published demo-admin
  credentials can modify or delete anything in this demo's database —
  that's expected, not a bug, and resets restore the known-good state.
- **This is not a place to store anything real.** Don't register with a
  real password you reuse elsewhere, and don't treat anything you submit
  here as private.

## Want to run your own?

This demo exists to show what Sentry looks and feels like. To run your
own instance — with your own challenges, your own users, and data that
doesn't reset — see the main project:
<https://github.com/raj-vishw/Sentry>.
