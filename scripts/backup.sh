#!/usr/bin/env bash
# Backs up MongoDB (a dedicated external Atlas/managed cluster — there is
# no local `mongodb` container to exec into) and the uploaded-challenge-
# files volume, into ./backups/<timestamp>/.
#
# MongoDB itself is backed up by running `mongodump` in a throwaway
# `mongo:7` container against MONGODB_URI directly — no mongo tools need
# to be installed on this host. Requires MONGODB_URI to be set in the
# environment (e.g. `set -a; source .env; set +a` first, or your
# platform's secret manager).
#
# Atlas also has its own built-in backup/snapshot features — consider
# using those instead of/alongside this script for anything beyond a
# quick manual export.
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="backups/${TIMESTAMP}"

if [ -z "${MONGODB_URI:-}" ]; then
  echo "Error: MONGODB_URI is not set in the environment." >&2
  echo "Example: set -a; source .env; set +a; ./scripts/backup.sh" >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"

echo "Backing up MongoDB..."
docker run --rm mongo:7 mongodump --uri="${MONGODB_URI}" --archive --gzip > "${OUT_DIR}/mongodb.gz"

echo "Backing up uploaded challenge files..."
# Reads through the running backend container's own filesystem view of the
# uploads volume — avoids needing to know Docker's generated volume name.
docker compose -f "${COMPOSE_FILE}" exec -T backend tar czf - -C /app uploads > "${OUT_DIR}/uploads.tar.gz"

echo "Backup complete: ${OUT_DIR}/mongodb.gz, ${OUT_DIR}/uploads.tar.gz"
echo "Keep these somewhere other than this host — a backup on the same disk as what it backs up isn't a real backup."
