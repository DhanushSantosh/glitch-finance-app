# Platform Readiness Baseline

## CI/CD Pipeline

Implemented:
- GitHub Actions workflow: `.github/workflows/ci.yml`
- Trigger: push to `main` and pull requests
- Stages:
  1. Install dependencies
  2. Workspace typecheck
  3. API test suite (includes migrations)
  4. Mobile test suite

Quality gate:
- Merge to `main` should be blocked unless CI is green.

## Staging and Production Provisioning

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

Rotation policy:
- Rotate high-sensitivity secrets every 90 days.
- Rotate immediately on suspected leak.
- Use dual-secret rollout where possible to avoid downtime.
- Record rotation event in release notes and operations log.

## OTP Provider Rollout

Current state:
- Development uses console OTP delivery.

Production readiness requirement:
1. Enable a real email OTP provider implementation via existing provider abstraction.
2. Add delivery monitoring (send success rate and latency).
3. Add fallback behavior and alerting for provider outage.
4. Disable debug OTP exposure in all non-development deployments.

## Monitoring and Alerting Baseline

Minimum production telemetry:
- API request volume, p95 latency, and error rate
- Auth endpoint rate-limit events
- Database connectivity and query error rate
- Redis connectivity status

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
