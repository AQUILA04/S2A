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

# Export IMAGE for compose substitution
export IMAGE

echo "==> Deploying ${IMAGE} (project: ${COMPOSE_PROJECT})"
docker compose -f "${COMPOSE_FILE}" --project-name "${COMPOSE_PROJECT}" pull app
docker compose -f "${COMPOSE_FILE}" --project-name "${COMPOSE_PROJECT}" up -d --remove-orphans

echo "==> Waiting for health check..."
sleep 5
docker compose -f "${COMPOSE_FILE}" --project-name "${COMPOSE_PROJECT}" ps

APP_HOST="$(grep -E '^APP_HOST=' .env.prod | cut -d= -f2- | tr -d '"' || true)"
APP_HOST="${APP_HOST:-s2a.optimizesolux.com}"
echo "==> Deployed. Check: https://${APP_HOST}/login"
