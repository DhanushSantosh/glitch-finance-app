#!/usr/bin/env bash
set -euo pipefail

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required for backup." >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required." >&2
  exit 1
fi

backup_dir="${BACKUP_DIR:-./backups}"
timestamp="$(date -u +"%Y%m%dT%H%M%SZ")"
output_file="${backup_dir}/glitch_${timestamp}.dump"

mkdir -p "$backup_dir"

pg_dump --format=custom --compress=9 --no-owner --no-privileges --file "$output_file" "$DATABASE_URL"

echo "Backup created: $output_file"

