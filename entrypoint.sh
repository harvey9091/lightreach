#!/bin/sh
set -e

# Fix ownership of the data directory so the nextjs user can create/update
# the SQLite database when DATABASE_URL points to a Docker volume mount
# (which is root-owned by default).
DATA_DIR="$(dirname "${DATABASE_URL:-file:/app/data.db}" | sed 's/^file://')"
mkdir -p "${DATA_DIR}" 2>/dev/null || true
chown -R 1001:1001 "${DATA_DIR}" 2>/dev/null || true

# Drop privileges and start the Next.js server.
exec runuser -u nextjs -- node apps/web/server.js
