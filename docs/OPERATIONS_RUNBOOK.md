# Operations Runbook

## Local Startup

```bash
cd /home/dhanush/Projects/glitch-finance-app
pnpm install
pnpm db:up
pnpm --filter @glitch/api db:migrate
pnpm dev:android
```

## Core Commands

```bash
pnpm dev:api
pnpm android:fast
pnpm db:logs
pnpm db:down
```

## Environment Variables

API (`apps/api/.env`):

- `NODE_ENV`
- `API_PORT`
- `API_HOST`
- `MOBILE_APP_ORIGIN`
- `DATABASE_URL`
- `REDIS_URL`
- `OTP_HASH_SECRET`
- `OTP_PROVIDER` (`console` or `resend`)
- `OTP_EMAIL_FROM`
- `RESEND_API_KEY` (required when `OTP_PROVIDER=resend`)
- `AUTH_OTP_TTL_SECONDS`
- `AUTH_MAX_OTP_ATTEMPTS`
- `AUTH_SESSION_TTL_DAYS`
- `AUTH_MAX_ACTIVE_SESSIONS`
- `AUTH_RATE_LIMIT_WINDOW_SECONDS`
- `AUTH_RATE_LIMIT_MAX_REQUEST_OTP`
- `AUTH_RATE_LIMIT_MAX_VERIFY_OTP`
- `SMS_DISCLOSURE_VERSION`
- `APP_CURRENCY`

Mobile (`apps/mobile/.env`):

- `EXPO_PUBLIC_API_URL`

## Health Checks

```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/v1/status
curl http://localhost:4000/api/v1/bootstrap
curl http://localhost:4000/api/v1/metrics
```

`/api/v1/status` includes dependency health signals:
- `dependencies.databaseHealthy`
- `dependencies.redisHealthy`

## Common Troubleshooting

### API cannot connect to DB

1. Run `pnpm db:up`.
2. Verify postgres container is healthy with `pnpm db:logs`.
3. Re-run `pnpm --filter @glitch/api db:migrate`.
4. Restart API with `pnpm dev:api`.

If startup fails, API now logs actionable hints for connection refusal.

### Mobile cannot reach API on Android emulator

Set in `apps/mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
```

Restart Expo after update.

### OTP works in tests but not local flow

- In development, OTP is delivered via API logs.
- Check API terminal output for generated OTP code.

### Production OTP email delivery

1. Set `OTP_PROVIDER=resend`.
2. Set `OTP_EMAIL_FROM` and `RESEND_API_KEY`.
3. Restart API and verify `/api/v1/auth/request-otp`.

## Backup and Restore Scripts

```bash
export DATABASE_URL=postgresql://...
pnpm backup:create
./scripts/backup/postgres-restore.sh ./backups/<file>.dump
```

## Secrets Rotation

```bash
pnpm secrets:otp
```

Use generated value for `OTP_HASH_SECRET` in staging and production secret stores.

## Release Readiness Checklist

1. All tests green in CI.
2. Migrations applied in target environment.
3. Secrets configured with production values.
4. SMS remains disabled by default until explicit release gate.

## CI Workflow

GitHub Actions pipeline is defined in:

`/.github/workflows/ci.yml`

It validates:
1. Workspace typecheck
2. API tests
3. Mobile tests

Additional workflows:
1. `/.github/workflows/cd-image.yml` - builds and pushes API container image to GHCR.
2. `/.github/workflows/dr-drill.yml` - manual backup/restore disaster recovery drill.
