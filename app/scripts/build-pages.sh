#!/usr/bin/env bash
# Static GitHub Pages build: niches pre-sequenced from live Oriane data, fork engine in-browser,
# no API key shipped. Output: app/out  (publish to the gh-pages branch)
set -euo pipefail
cd "$(dirname "$0")/.."
export npm_config_cache="${npm_config_cache:-${TMPDIR:-/tmp}/helix-npm-cache}"
npx --yes tsx scripts/precompute.ts
rm -rf .next/types .next/dev/types
STASH="$(mktemp -d)"
mv app/api "$STASH/api"
trap 'mv "$STASH/api" app/api' EXIT
HELIX_STATIC=1 NEXT_PUBLIC_STATIC=1 NEXT_PUBLIC_BASE_PATH="${PAGES_BASE_PATH:-/helix}" npx next build
touch out/.nojekyll
echo "static site ready in app/out"
