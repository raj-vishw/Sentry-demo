#!/usr/bin/env bash
# Wipes and reseeds the sentry-demo database back to its known-good
# starting state (5 categories, 15 challenges, the 2 published demo
# accounts). Safe to run repeatedly — src/config/isolationGuard.ts
# refuses to run against anything that doesn't look like this demo's own
# database, and there is nothing else in this database to preserve: the
# whole thing IS the demo.
#
# Usage:
#   ./scripts/reset-demo.sh                  # against the production stack
#   COMPOSE_FILE=docker-compose.yml ./scripts/reset-demo.sh   # against dev
#
# To run this automatically on a schedule, wire it into cron, e.g.:
#   0 */6 * * * cd /path/to/sentry-demo && ./scripts/reset-demo.sh >> /var/log/sentry-demo-reset.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"

echo "Resetting sentry-demo via ${COMPOSE_FILE}..."
docker compose -f "${COMPOSE_FILE}" exec -T backend npm run seed:demo
echo "Reset complete."
