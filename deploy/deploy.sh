#!/usr/bin/env bash
# Pull image and restart the production stack.
# Usage: bash deploy.sh [image-tag]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

COMPOSE_FILE="docker-compose.prod.yml"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-s2a}"
IMAGE_TAG="${1:-latest}"
IMAGE="${IMAGE:-ghcr.io/aquila04/s2a:${IMAGE_TAG}}"

if [[ ! -f .env.prod ]]; then
  echo "Missing .env.prod — copy from .env.prod.example and configure secrets."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.prod
set +a

export IMAGE
export DB_USER="${DB_USER:-s2a}"
export DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD required in .env.prod}"
export DB_NAME="${DB_NAME:-s2a}"

echo "==> Deploying ${IMAGE} (project: ${COMPOSE_PROJECT})"
docker compose -f "${COMPOSE_FILE}" --project-name "${COMPOSE_PROJECT}" --env-file .env.prod pull app
docker compose -f "${COMPOSE_FILE}" --project-name "${COMPOSE_PROJECT}" --env-file .env.prod up -d --remove-orphans

echo "==> Waiting for db + app..."
sleep 8
docker compose -f "${COMPOSE_FILE}" --project-name "${COMPOSE_PROJECT}" --env-file .env.prod ps

if [[ -f seed.mjs ]]; then
  echo "==> Seeding admin accounts (idempotent)..."
  NETWORK="$(docker inspect s2a-db --format '{{range $k, $v := .NetworkSettings.Networks}}{{println $k}}{{end}}' | head -n1 || true)"
  if [[ -n "${NETWORK}" ]]; then
    docker run --rm \
      --network "${NETWORK}" \
      -e DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}" \
      -v "${SCRIPT_DIR}/seed.mjs:/work/seed.mjs:ro" \
      -w /work \
      node:20-alpine \
      sh -c 'mkdir -p /tmp/seedpkg && cd /tmp/seedpkg && npm init -y >/dev/null && npm install --silent postgres@3.4.9 bcryptjs@2.4.3 && cp /work/seed.mjs ./seed.mjs && node seed.mjs' \
      || echo "WARN: seed failed (non-fatal)"
  else
    echo "WARN: could not resolve db network for seed"
  fi
fi

APP_HOST="$(grep -E '^APP_HOST=' .env.prod | cut -d= -f2- | tr -d '"' || true)"
APP_HOST="${APP_HOST:-s2a.optimizesolux.com}"
echo "==> Deployed. Check: https://${APP_HOST}/login"
