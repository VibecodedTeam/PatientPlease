#!/usr/bin/env bash
# Stops the local dev stack started by run-local.sh: kills any running
# backend/frontend pnpm dev processes and stops the postgres container.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

echo "Stopping dev servers..."
pkill -f "tsx watch src/server.ts" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

echo "Stopping postgres..."
docker compose -f docker/docker-compose.yml stop postgres

echo "Done."
