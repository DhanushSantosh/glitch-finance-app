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
require_var "PUBLIC_API_BASE_URL"
require_var "TRUST_PROXY_HOPS"

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

debug_otp_exposure="$(printf '%s' "${DEBUG_OTP_EXPOSURE:-false}" | tr '[:upper:]' '[:lower:]')"
status_endpoint_enabled="$(printf '%s' "${STATUS_ENDPOINT_ENABLED:-false}" | tr '[:upper:]' '[:lower:]')"
metrics_endpoint_enabled="$(printf '%s' "${METRICS_ENDPOINT_ENABLED:-false}" | tr '[:upper:]' '[:lower:]')"

if [[ "${deployment_env}" == "production" && "${OTP_PROVIDER}" != "resend" ]]; then
  echo "Production requires OTP_PROVIDER=resend." >&2
  exit 1
fi

if [[ "${deployment_env}" == "production" && -z "${ALERTS_WEBHOOK_URL:-}" ]]; then
  echo "Production requires ALERTS_WEBHOOK_URL for operational alert delivery." >&2
  exit 1
fi

if [[ "${deployment_env}" == "production" ]]; then
  if [[ "${debug_otp_exposure}" == "1" || "${debug_otp_exposure}" == "true" || "${debug_otp_exposure}" == "yes" || "${debug_otp_exposure}" == "on" ]]; then
    echo "Production requires DEBUG_OTP_EXPOSURE=false." >&2
    exit 1
  fi

  if [[ "${status_endpoint_enabled}" == "1" || "${status_endpoint_enabled}" == "true" || "${status_endpoint_enabled}" == "yes" || "${status_endpoint_enabled}" == "on" ]]; then
    echo "Production should keep STATUS_ENDPOINT_ENABLED=false unless there is an explicit internal-only requirement." >&2
    exit 1
  fi

  if [[ "${metrics_endpoint_enabled}" == "1" || "${metrics_endpoint_enabled}" == "true" || "${metrics_endpoint_enabled}" == "yes" || "${metrics_endpoint_enabled}" == "on" ]]; then
    echo "Production should keep METRICS_ENDPOINT_ENABLED=false on the public app service." >&2
    exit 1
  fi

  slo_enabled="$(printf '%s' "${SLO_MONITOR_ENABLED:-}" | tr '[:upper:]' '[:lower:]')"
  if [[ "${slo_enabled}" != "1" && "${slo_enabled}" != "true" && "${slo_enabled}" != "yes" && "${slo_enabled}" != "on" ]]; then
    echo "Production requires SLO_MONITOR_ENABLED=true." >&2
    exit 1
  fi
fi

if [[ "${deployment_env}" == "staging" ]]; then
  if [[ "${debug_otp_exposure}" == "1" || "${debug_otp_exposure}" == "true" || "${debug_otp_exposure}" == "yes" || "${debug_otp_exposure}" == "on" ]]; then
    echo "Staging requires DEBUG_OTP_EXPOSURE=false." >&2
    exit 1
  fi
fi

echo "Runtime secrets validation passed for ${deployment_env}."
