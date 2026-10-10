#!/usr/bin/env bash
# Backs up MongoDB and the uploaded-challenge-files volume via the running
# compose services, into ./backups/<timestamp>/. A thin wrapper around the
# exact commands already documented in docs/deployment/self-hosting.md —
# no new backup system, just making those commands copy-pasteable.
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="backups/${TIMESTAMP}"

mkdir -p "${OUT_DIR}"

echo "Backing up MongoDB..."
docker compose -f "${COMPOSE_FILE}" exec -T mongodb mongodump --archive --gzip > "${OUT_DIR}/mongodb.gz"

echo "Backing up uploaded challenge files..."
# Reads through the running backend container's own filesystem view of the
# uploads volume — avoids needing to know Docker's generated volume name.
docker compose -f "${COMPOSE_FILE}" exec -T backend tar czf - -C /app uploads > "${OUT_DIR}/uploads.tar.gz"

echo "Backup complete: ${OUT_DIR}/mongodb.gz, ${OUT_DIR}/uploads.tar.gz"
echo "Keep these somewhere other than this host — a backup on the same disk as what it backs up isn't a real backup."
