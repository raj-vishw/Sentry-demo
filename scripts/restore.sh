#!/usr/bin/env bash
# Restores a backup produced by backup.sh. Destructive — overwrites the
# current database and uploaded files. Requires explicit confirmation.
#
# MongoDB is a dedicated external Atlas/managed cluster — restored via a
# throwaway `mongo:7` container running `mongorestore` against
# MONGODB_URI directly, the same approach backup.sh uses.
#
# Usage: set -a; source .env; set +a; ./scripts/restore.sh backups/20260115-120000
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
BACKUP_DIR="${1:-}"

if [ -z "${BACKUP_DIR}" ]; then
  echo "Usage: $0 <backup-directory>" >&2
  echo "Example: $0 backups/20260115-120000" >&2
  exit 1
fi

if [ -z "${MONGODB_URI:-}" ]; then
  echo "Error: MONGODB_URI is not set in the environment." >&2
  echo "Example: set -a; source .env; set +a; $0 ${BACKUP_DIR}" >&2
  exit 1
fi

if [ ! -f "${BACKUP_DIR}/mongodb.gz" ] || [ ! -f "${BACKUP_DIR}/uploads.tar.gz" ]; then
  echo "Error: ${BACKUP_DIR} doesn't look like a backup.sh output directory (missing mongodb.gz or uploads.tar.gz)." >&2
  exit 1
fi

echo "This will OVERWRITE the current database and uploaded files with the contents of ${BACKUP_DIR}."
echo "This cannot be undone."
read -r -p "Type 'restore' to continue: " confirmation
if [ "${confirmation}" != "restore" ]; then
  echo "Aborted."
  exit 1
fi

echo "Restoring MongoDB..."
docker run --rm -i mongo:7 mongorestore --uri="${MONGODB_URI}" --archive --gzip --drop < "${BACKUP_DIR}/mongodb.gz"

echo "Restoring uploaded challenge files..."
docker compose -f "${COMPOSE_FILE}" exec -T backend sh -c 'rm -rf /app/uploads/* && tar xzf - -C /app' < "${BACKUP_DIR}/uploads.tar.gz"

echo "Restore complete. Restart the backend if it was already running: docker compose -f ${COMPOSE_FILE} restart backend"
