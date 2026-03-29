# Render Provisioning Blueprints

Provisioning manifests:

- `staging.yaml`
- `production.yaml`

## Usage

1. Create a Render Blueprint project.
2. Select the matching manifest (`staging.yaml` or `production.yaml`).
3. Provide secret values:
   - `RESEND_API_KEY`
   - `OTP_HASH_SECRET`
   - `ALERTS_WEBHOOK_URL` (recommended for staging/production)
4. Configure auth + SLO policy env vars explicitly (TTL, max attempts, session lifetime, active session cap, rate limits, SLO thresholds).
5. Set `PUBLIC_API_BASE_URL`, `TRUST_PROXY_HOPS`, `DEBUG_OTP_EXPOSURE`, `STATUS_ENDPOINT_ENABLED`, and `METRICS_ENDPOINT_ENABLED` to match the target environment.
6. Apply blueprint and verify public liveness at `/health` plus gated internal endpoints according to the manifest.

## Notes

- Production blueprint starts with two API instances.
- Production auto-deploy is intentionally disabled to require a promotion gate.
- Configure backup policies on managed Postgres before launch.
- Store secrets in Render Environment Groups (or equivalent managed secret store), not in files.
