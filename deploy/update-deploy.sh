#!/usr/bin/env bash
# Rsync deploy folder from CI workspace to VPS and run deploy.sh
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/optimizesolux/s2a}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

ssh "${PROD_SERVER_USER}@${PROD_SERVER_HOST}" "mkdir -p ${DEPLOY_PATH}"

rsync -avz --delete \
  --exclude '.env.prod' \
  ./deploy/ "${PROD_SERVER_USER}@${PROD_SERVER_HOST}:${DEPLOY_PATH}/"

ssh "${PROD_SERVER_USER}@${PROD_SERVER_HOST}" \
  "cd ${DEPLOY_PATH} && bash init.sh && bash deploy.sh ${IMAGE_TAG}"
