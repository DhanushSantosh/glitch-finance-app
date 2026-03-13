# Glitch Finance App

Production-oriented monorepo for Quantex25 Sprint 1.1:

- `apps/mobile` - React Native + Expo app with Email OTP auth, dashboard, transactions, category studio, budgets, goals
- `apps/api` - Fastify + Drizzle API (auth, categories, transactions, reports, exports, budgets, goals, consents, audit, metrics)
- `infra` - Docker Compose services (Postgres + Redis)

## 1. Prerequisites

- Git
- Node.js `>=22`
- pnpm `>=10`
- Docker Desktop (or Docker Engine + Compose)
- For mobile development:
  - Android: Android Studio + Android SDK/emulator
  - iOS (macOS only): Xcode + iOS Simulator

## 2. First-time setup

```bash
git clone <your-fork-or-repo-url>
cd glitch-finance-app
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
pnpm db:up
pnpm --filter @glitch/api db:migrate
```

If you use Android emulator, set:

```env
# apps/mobile/.env
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
```

If you use iOS simulator or web, set:

```env
# apps/mobile/.env
EXPO_PUBLIC_API_URL=http://localhost:4000
```

## 3. Start the app

Full stack (recommended):

```bash
pnpm dev:android
```

Alternative split:

```bash
pnpm dev:api
pnpm android:fast
```

Other options:

```bash
pnpm dev:mobile  # Expo only
pnpm dev         # API + Expo (no forced Android launch)
```

## 4. Sprint 1.1 API surface

- `POST /api/v1/auth/request-otp`
- `POST /api/v1/auth/verify-otp`
- `POST /api/v1/auth/recovery/request-otp`
- `POST /api/v1/auth/recovery/verify-otp`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`
- `DELETE /api/v1/account`
- `GET /api/v1/categories`
- `POST /api/v1/categories`
- `PATCH /api/v1/categories/:id`
- `DELETE /api/v1/categories/:id`
- `GET /api/v1/transactions`
- `POST /api/v1/transactions`
- `PATCH /api/v1/transactions/:id`
- `DELETE /api/v1/transactions/:id`
- `GET /api/v1/reports/summary`
- `GET /api/v1/reports/export`
- `GET /api/v1/budgets`
- `POST /api/v1/budgets`
- `PATCH /api/v1/budgets/:id`
- `DELETE /api/v1/budgets/:id`
- `GET /api/v1/goals`
- `POST /api/v1/goals`
- `PATCH /api/v1/goals/:id`
- `DELETE /api/v1/goals/:id`
- `GET /api/v1/bootstrap`
- `GET /api/v1/consents/sms-import`
- `POST /api/v1/consents/sms-import-intent`
- `GET /api/v1/metrics`

## 5. Useful commands

```bash
pnpm android:fast                 # start fast Android flow + Expo Android
pnpm android:emulator             # start only emulator
pnpm dev:api                      # backend only
pnpm dev:mobile                   # mobile only
pnpm --filter @glitch/api test    # API unit + integration tests
pnpm --filter @glitch/mobile test # mobile flow unit tests
pnpm typecheck                    # type checks all workspaces
pnpm secrets:otp                  # generate high-entropy OTP hash secret
pnpm backup:create                # create postgres backup (requires DATABASE_URL)
pnpm db:logs                      # postgres/redis logs
pnpm db:down                      # stop database containers
```

## 6. Health checks

```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/v1/bootstrap
curl http://localhost:4000/api/v1/metrics
```

## 7. Notes

- SMS detection is disabled by default in Sprint 1.1 and exposed as intent logging only.
- OTP values are logged to API console in development delivery mode.
- Automatic category suggestion uses deterministic rules and user correction history.
- Production OTP email delivery can be enabled by setting `OTP_PROVIDER=resend`.

## 8. Documentation

Documentation hub: [`docs/README.md`](./docs/README.md)

Primary references:

- Architecture: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- API contracts: [`docs/API_REFERENCE.md`](./docs/API_REFERENCE.md)
- Data model: [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md)
- Security/privacy: [`docs/SECURITY_PRIVACY.md`](./docs/SECURITY_PRIVACY.md)
- Testing strategy: [`docs/TESTING.md`](./docs/TESTING.md)
- Operations runbook: [`docs/OPERATIONS_RUNBOOK.md`](./docs/OPERATIONS_RUNBOOK.md)
- Platform readiness: [`docs/PLATFORM_READINESS.md`](./docs/PLATFORM_READINESS.md)
- SRS mapping: [`docs/SPRINT1_TRACEABILITY.md`](./docs/SPRINT1_TRACEABILITY.md)
