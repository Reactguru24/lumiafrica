#!/usr/bin/env bash
# Seed 20 products per approved vendor.
# Usage:
#   ./scripts/seed-vendor-products.sh           # uses backend/.env
#   ./scripts/seed-vendor-products.sh --railway # runs via Railway CLI (production DB)

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

if [[ "${1:-}" == "--railway" ]]; then
  echo "Running vendor product seeder on Railway (uses linked project DB)..."
  exec npx --yes @railway/cli run -- go run ./cmd/seeder/main.go -seed=false -vendor-products
fi

if [[ ! -f .env ]]; then
  echo "No backend/.env found."
  echo ""
  echo "For Railway (live vendors):"
  echo "  cp .env.railway.example .env"
  echo "  # Edit .env with MySQL values from Railway dashboard"
  echo "  make seed-vendor-products"
  echo ""
  echo "Or run without a local .env:"
  echo "  ../scripts/seed-vendor-products.sh --railway"
  echo ""
  echo "For local Docker MySQL:"
  echo "  cd .. && docker compose up -d mysql"
  echo "  cp .env.example .env   # DB_USER=root DB_PASSWORD=root DB_HOST=127.0.0.1"
  exit 1
fi

exec go run ./cmd/seeder/main.go -seed=false -vendor-products -skip-migrate
