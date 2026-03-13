#!/usr/bin/env bash
set -euo pipefail

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore is required for restore." >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <path-to-backup.dump>" >&2
  exit 1
fi

backup_file="$1"
if [[ ! -f "$backup_file" ]]; then
  echo "Backup file not found: $backup_file" >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required." >&2
  exit 1
fi

pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$DATABASE_URL" "$backup_file"

echo "Restore completed from: $backup_file"

