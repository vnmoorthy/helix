#!/usr/bin/env bash
# Deploy Helix to Vercel with your Oriane key (read from app/.env.local).
# Usage (from the repo root):  bash app/scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
KEY=$(grep '^ORIANE_API_KEY=' .env.local | cut -d= -f2-)
if [ -z "${KEY}" ]; then echo "Add ORIANE_API_KEY to app/.env.local first"; exit 1; fi
export npm_config_cache="${TMPDIR:-/tmp}/helix-npm-cache"
if npx --yes vercel@latest whoami >/dev/null 2>&1; then
  npx --yes vercel@latest deploy --prod --yes --env ORIANE_API_KEY="$KEY"
else
  echo "Not logged in to Vercel — creating a temporary deployment you can claim later (or run: npx vercel login)"
  npx --yes vercel@latest deploy --temporary --prod --yes --env ORIANE_API_KEY="$KEY"
fi
