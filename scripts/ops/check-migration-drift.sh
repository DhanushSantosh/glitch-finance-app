#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${PROJECT_ROOT}"

pnpm --filter @velqora/api db:generate

if ! git diff --quiet -- apps/api/drizzle; then
  echo "Migration drift detected in apps/api/drizzle."
  echo "Commit generated migration files before merging."
  git --no-pager diff -- apps/api/drizzle
  exit 1
fi

echo "Migration drift check passed."
