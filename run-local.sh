#!/usr/bin/env bash
# Runs the app locally with hot reload: postgres in Docker, backend (tsx watch)
# and frontend (vite dev server) run directly via pnpm so edits apply instantly.
# Frontend: http://localhost:5173  Backend: http://localhost:4000

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

if ! command -v pnpm >/dev/null 2>&1; then
  export PATH="$HOME/.hermes/node/bin:$PATH"
fi

cleanup() {
  trap - EXIT INT TERM
  echo "Stopping dev servers..."
  kill 0
}
trap cleanup EXIT INT TERM

echo "Starting postgres..."
docker compose -f docker/docker-compose.yml up -d postgres

echo "Waiting for postgres to be healthy..."
until [ "$(docker compose -f docker/docker-compose.yml ps -q postgres | xargs docker inspect -f '{{.State.Health.Status}}')" = "healthy" ]; do
  sleep 1
done

export DATABASE_URL="${DATABASE_URL:-postgresql://game:game@localhost:5432/skin_disease_game}"

# Local-only secrets (e.g. GEMINI_API_KEY) live outside .env so they're never
# committed; gitignored, loaded here if present.
if [ -f src/backend/.env.secrets ]; then
  set -a
  # shellcheck disable=SC1091
  source src/backend/.env.secrets
  set +a
fi

pnpm --filter ./src/backend dev &
pnpm --filter ./src/frontend dev &

wait
