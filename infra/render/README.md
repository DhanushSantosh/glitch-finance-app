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
4. Configure auth policy env vars explicitly (TTL, max attempts, session lifetime, active session cap, rate limits).
5. Apply blueprint and verify service health at `/api/v1/status`.

## Notes

- Production blueprint starts with two API instances.
- Production auto-deploy is intentionally disabled to require a promotion gate.
- Configure backup policies on managed Postgres before launch.
- Store secrets in Render Environment Groups (or equivalent managed secret store), not in files.
