# Platform Readiness Baseline

## CI/CD Pipeline

Implemented:
- GitHub Actions workflow: `.github/workflows/ci.yml`
- API image publish workflow: `.github/workflows/cd-image.yml`
- Trigger: push to `main` and pull requests
- Stages:
  1. Install dependencies
  2. Workspace lint
  3. Workspace typecheck
  4. Migration drift check (`pnpm db:check`)
  5. API test suite (includes migrations)
  6. Mobile test suite

Quality gate:
- Merge to `main` should be blocked unless CI is green.

## Staging and Production Provisioning

Implemented baseline artifacts:
- Render Blueprint manifests:
  - `infra/render/staging.yaml`
  - `infra/render/production.yaml`
- API container image build path: `apps/api/Dockerfile`

Target runtime shape:
- Stateless API service replicas
- Managed PostgreSQL
- Managed Redis (for rate-limit state and future queueing)
- Managed object storage for future statement imports
- HTTPS ingress with WAF and TLS certificates

Provisioning checklist:
1. Create separate staging and production projects/accounts.
2. Provision dedicated Postgres and Redis instances per environment.
3. Create private networking between compute and databases.
4. Configure API environment variables via secret manager, not `.env` files.
5. Restrict database ingress to app network only.
6. Enable automated database backups before first production release.

## Managed Secrets and Key Rotation

Secrets that must be managed centrally:
- `DATABASE_URL`
- `REDIS_URL`
- `OTP_HASH_SECRET`
- Email OTP provider secrets (for production provider)
- `ALERTS_WEBHOOK_URL`
- SLO monitor policy values (`SLO_MONITOR_*`)

Implemented tooling:
- Secret generation helper: `scripts/ops/generate-otp-secret.sh`

Rotation policy:
- Rotate high-sensitivity secrets every 90 days.
- Rotate immediately on suspected leak.
- Use dual-secret rollout where possible to avoid downtime.
- Record rotation event in release notes and operations log.

## OTP Provider Rollout

Current state:
- Development uses console OTP delivery.
- Production and staging manifests are configured for Resend (`OTP_PROVIDER=resend`).
- API now fails OTP request safely with `503 OTP_DELIVERY_FAILED` on provider outages.

Production readiness requirement:
1. Configure `RESEND_API_KEY` through managed secrets.
2. Add delivery monitoring (send success rate and latency).
3. Alert on elevated `OTP_DELIVERY_FAILED` rates.
4. Keep debug OTP exposure disabled in non-development deployments.
5. Keep `SMS_IMPORT_SCAN_ENABLED=false` until explicit rollout approval.

## Monitoring and Alerting Baseline

Minimum production telemetry:
- API request volume, p95 latency, and error rate
- Auth endpoint rate-limit events
- Database connectivity and query error rate
- Redis connectivity status

Implemented telemetry endpoints:
- `GET /api/v1/status` for dependency health
- `GET /api/v1/metrics` for Prometheus scrape metrics
- Webhook alerting service for unhandled API 5xx errors and OTP delivery failures (`ALERTS_WEBHOOK_URL`)
- Rolling-window SLO monitor for 5xx rate and OTP delivery failure thresholds (`SLO_MONITOR_ENABLED=true`)

Alert thresholds (initial):
- 5xx error rate > 2% for 5 minutes
- API p95 latency > 800 ms for 10 minutes
- Database unhealthy status from `/api/v1/status`

Dashboards:
- Service health dashboard (uptime + dependency health)
- Auth funnel dashboard (request OTP -> verify OTP success)
- Transaction write/read performance dashboard

## Backup, Restore, and DR Drill

Backup baseline:
- Daily full Postgres backup
- Point-in-time recovery enabled
- Backup retention >= 30 days

Restore drill cadence:
- Run a restore drill at least once per quarter.
- Validate:
  1. Restore time objective (RTO)
  2. Recovery point objective (RPO)
  3. Application correctness after restore

DR checklist:
1. Restore latest backup to isolated environment.
2. Run migration state verification.
3. Run smoke tests (`/health`, auth login, transaction read/write).
4. Document elapsed recovery time and issues.

Implemented automation:
- Backup script: `scripts/backup/postgres-backup.sh`
- Restore script: `scripts/backup/postgres-restore.sh`
- Manual DR drill workflow: `.github/workflows/dr-drill.yml`
