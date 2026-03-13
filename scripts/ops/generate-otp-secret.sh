#!/usr/bin/env bash
set -euo pipefail

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl is required to generate secure secrets." >&2
  exit 1
fi

length="${1:-64}"
if ! [[ "$length" =~ ^[0-9]+$ ]]; then
  echo "Length must be a positive integer." >&2
  exit 1
fi

secret="$(openssl rand -hex "$length")"

echo "Generated OTP_HASH_SECRET:"
echo "$secret"
echo ""
echo "Next steps:"
echo "1. Update OTP_HASH_SECRET in your secret manager for staging and production."
echo "2. Restart API instances with the new secret."
echo "3. Verify auth flow with a fresh OTP request and login."

