#!/usr/bin/env bash
# First-time VPS bootstrap for Amicale S2A on Contabo.
# Run as root on the VPS: bash setup-server.sh
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/optimizesolux/s2a}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-s2a}"

echo "==> Ensuring Docker is available..."
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found. Install Docker Engine before continuing."
  exit 1
fi

echo "==> Ensuring traefik-public network exists..."
docker network inspect traefik-public >/dev/null 2>&1 \
  || docker network create traefik-public

echo "==> Creating deploy directory: ${DEPLOY_PATH}"
mkdir -p "${DEPLOY_PATH}"

if [[ ! -f "${DEPLOY_PATH}/.env.prod" ]]; then
  echo "==> Copy deploy/.env.prod.example to ${DEPLOY_PATH}/.env.prod and fill secrets."
  if [[ -f "${DEPLOY_PATH}/.env.prod.example" ]]; then
    cp "${DEPLOY_PATH}/.env.prod.example" "${DEPLOY_PATH}/.env.prod"
  fi
fi

echo "==> Setup complete."
echo "    Next: copy deploy artefacts to ${DEPLOY_PATH}, edit .env.prod, then run deploy.sh"
