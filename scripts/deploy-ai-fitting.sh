#!/usr/bin/env bash
# Deploy ai-fitting-tool to Railway from the monorepo.
#
# Usage:
#   ./scripts/deploy-ai-fitting.sh
#   RAILWAY_PROJECT_ID=xxx ./scripts/deploy-ai-fitting.sh
#
# First time:
#   npx railway login
#   RAILWAY_PROJECT_ID=<dazzling-smile project id> ./scripts/deploy-ai-fitting.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ML_DIR="$ROOT/ai-fitting-tool"
RAILWAY="$ROOT/node_modules/.bin/railway"
SERVICE_NAME="${RAILWAY_SERVICE:-ai-fitting}"
BACKEND_URL="${BACKEND_API_URL:-https://dazzling-smile-production-1014.up.railway.app}"
FRONTEND_URL="${ALLOWED_ORIGINS:-https://lumiafricca.netlify.app}"

if [[ ! -x "$RAILWAY" ]]; then
  echo "Installing Railway CLI..."
  (cd "$ROOT" && npm install @railway/cli --save-dev)
fi

if ! "$RAILWAY" whoami >/dev/null 2>&1; then
  echo "Not logged in. Run: npx railway login"
  echo "Then re-run this script."
  exit 1
fi

PROJECT_FLAG=()
if [[ -n "${RAILWAY_PROJECT_ID:-}" ]]; then
  PROJECT_FLAG=(-p "$RAILWAY_PROJECT_ID")
fi

echo "==> Ensuring Railway service '$SERVICE_NAME' exists..."
if ! "$RAILWAY" add --service "$SERVICE_NAME" "${PROJECT_FLAG[@]}" --json 2>/dev/null; then
  echo "    (service may already exist — continuing)"
fi

echo "==> Setting environment variables..."
"$RAILWAY" variables set \
  "${PROJECT_FLAG[@]}" \
  -s "$SERVICE_NAME" \
  "BACKEND_API_URL=$BACKEND_URL" \
  "ALLOWED_ORIGINS=$FRONTEND_URL,http://localhost:3000" \
  "PORT=80"

echo "==> Deploying from $ML_DIR ..."
"$RAILWAY" up "$ML_DIR" -d -y \
  "${PROJECT_FLAG[@]}" \
  -s "$SERVICE_NAME" \
  -e "${RAILWAY_ENVIRONMENT:-production}"

echo ""
echo "==> Generate a public URL (if needed):"
echo "    npx railway domain -s $SERVICE_NAME ${PROJECT_FLAG[*]}"
echo ""
echo "==> Then set on Netlify:"
echo "    ML_API_URL=<your ML public URL>"
echo "    Trigger a Netlify redeploy."
