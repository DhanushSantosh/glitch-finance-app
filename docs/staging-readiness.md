# Staging Readiness Checklist

Use this document before promoting security-sensitive backend changes or preparing a production release candidate.

## Goal

Confirm that staging matches the intended hardened deployment shape:

- canonical public origin is configured
- proxy trust is correct
- debug OTP exposure is disabled
- operational endpoints follow the expected exposure model
- auth and finance smoke flows still work end to end

## Required Staging Environment

Expected values from [staging.yaml](../infra/render/staging.yaml).

Until custom DNS is live, use the Render default hostname:

- `https://velqora-api-staging.onrender.com`

| Variable | Expected value |
|---|---|
| `NODE_ENV` | `production` |
| `PUBLIC_API_BASE_URL` | `https://velqora-api-staging.onrender.com` |
| `TRUST_PROXY_HOPS` | `1` |
| `OTP_PROVIDER` | `resend` |
| `DEBUG_OTP_EXPOSURE` | `false` |
| `STATUS_ENDPOINT_ENABLED` | `true` |
| `METRICS_ENDPOINT_ENABLED` | `false` |
| `GOOGLE_OAUTH_ENABLED` | `false` |
| `SMS_IMPORT_SCAN_ENABLED` | `false` |

Required secrets:

- `DATABASE_URL`
- `REDIS_URL`
- `OTP_HASH_SECRET`
- `RESEND_API_KEY`
- `ALERTS_WEBHOOK_URL`

## Preflight Validation

1. Confirm Render env values match the staging blueprint.
2. Confirm `OTP_HASH_SECRET` is not the placeholder and has been rotated into the secret manager.
3. Confirm `DEBUG_OTP_EXPOSURE=false`.
4. Confirm `GOOGLE_OAUTH_ENABLED=false`.
5. Confirm `STATUS_ENDPOINT_ENABLED=true` and `METRICS_ENDPOINT_ENABLED=false`.
6. Confirm `PUBLIC_API_BASE_URL` matches the actual staging hostname.
7. Confirm the deployed service health check path is `/health`.

## Runtime Secret Validation

Run against the exact staging environment values:

```bash
DATABASE_URL=... \
REDIS_URL=... \
OTP_HASH_SECRET=... \
OTP_PROVIDER=resend \
OTP_EMAIL_FROM="Velqora <onboarding@resend.dev>" \
RESEND_API_KEY=... \
PUBLIC_API_BASE_URL=https://velqora-api-staging.onrender.com \
TRUST_PROXY_HOPS=1 \
DEBUG_OTP_EXPOSURE=false \
STATUS_ENDPOINT_ENABLED=true \
METRICS_ENDPOINT_ENABLED=false \
ALERTS_WEBHOOK_URL=https://alerts.example.com/velqora \
SLO_MONITOR_ENABLED=true \
./scripts/ops/validate-runtime-secrets.sh staging
```

## Smoke Validation

If staging does not expose debug OTPs, provide a known-good bearer token:

```bash
API_BASE_URL=https://velqora-api-staging.onrender.com \
SMOKE_TEST_EMAIL=smoke-check@example.com \
SMOKE_BEARER_TOKEN=<staging-token> \
SMOKE_EXPECT_STATUS_ENDPOINT=true \
SMOKE_EXPECT_METRICS_ENDPOINT=false \
pnpm smoke:staging
```

What this validates:

- `/health` responds
- `/api/v1/status` is enabled and reports provider readiness
- `/api/v1/metrics` is disabled as expected
- OTP request path works
- authenticated category lookup works
- transaction create/list/update/delete works
- report summary works

## Optional Performance Check

```bash
API_BASE_URL=https://velqora-api-staging.onrender.com \
PERF_BEARER_TOKEN=<staging-token> \
PERF_ITERATIONS=20 \
PERF_P95_THRESHOLD_MS=300 \
pnpm smoke:perf
```

## Manual Functional Checks

1. Login through the app using the real staging OTP provider.
2. Create, edit, and delete a transaction from mobile.
3. Verify profile read/update still works.
4. Upload then remove an avatar image.
5. Confirm that any returned avatar URL uses the canonical staging origin, not a spoofed host.

## Expected Security Posture

- `/health` is public
- `/api/v1/status` is available in staging only
- `/api/v1/metrics` is not public on staging app ingress
- OTP debug code is not returned in staging responses
- Google OAuth is not available
- Apple sign-in can only create/link accounts using verified provider email claims

## Promotion Gate

Do not treat staging as release-ready unless all of the following are true:

1. secret validation passes
2. staging smoke passes
3. mobile login works with the real OTP provider
4. alerts are configured
5. backup/restore drill has recent evidence
