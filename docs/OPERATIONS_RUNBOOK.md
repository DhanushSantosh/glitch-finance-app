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
- `AUTH_OTP_TTL_SECONDS`
- `AUTH_MAX_OTP_ATTEMPTS`
- `AUTH_SESSION_TTL_DAYS`
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
```

## Common Troubleshooting

### API cannot connect to DB

1. Run `pnpm db:up`.
2. Verify postgres container is healthy with `pnpm db:logs`.
3. Re-run `pnpm --filter @glitch/api db:migrate`.

### Mobile cannot reach API on Android emulator

Set in `apps/mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
```

Restart Expo after update.

### OTP works in tests but not local flow

- In development, OTP is delivered via API logs.
- Check API terminal output for generated OTP code.

## Release Readiness Checklist

1. All tests green in CI.
2. Migrations applied in target environment.
3. Secrets configured with production values.
4. SMS remains disabled by default until explicit release gate.
