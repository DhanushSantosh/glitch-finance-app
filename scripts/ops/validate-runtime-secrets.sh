#!/usr/bin/env bash
set -euo pipefail

deployment_env="${1:-production}"

require_var() {
  local key="$1"
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required env var: ${key}" >&2
    exit 1
  fi
}

require_var "DATABASE_URL"
require_var "REDIS_URL"
require_var "OTP_HASH_SECRET"
require_var "OTP_PROVIDER"
require_var "OTP_EMAIL_FROM"

if [[ "${OTP_HASH_SECRET}" == "change-me-in-production-otp-secret" ]]; then
  echo "OTP_HASH_SECRET cannot use the default placeholder value." >&2
  exit 1
fi

if [[ "${#OTP_HASH_SECRET}" -lt 32 ]]; then
  echo "OTP_HASH_SECRET must be at least 32 characters." >&2
  exit 1
fi

if [[ "${OTP_PROVIDER}" == "resend" ]]; then
  require_var "RESEND_API_KEY"
fi

if [[ "${deployment_env}" == "production" && "${OTP_PROVIDER}" != "resend" ]]; then
  echo "Production requires OTP_PROVIDER=resend." >&2
  exit 1
fi

if [[ "${deployment_env}" == "production" && -z "${ALERTS_WEBHOOK_URL:-}" ]]; then
  echo "Production requires ALERTS_WEBHOOK_URL for operational alert delivery." >&2
  exit 1
fi

echo "Runtime secrets validation passed for ${deployment_env}."
