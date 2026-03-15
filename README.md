# Glitch Finance App

A mobile-first personal finance tracker. Log transactions, set monthly budgets, track savings goals, and view financial summaries — secured with email OTP and a high-contrast dark UI.

## Repo structure

```
glitch-finance-app/
├── apps/
│   ├── api/          Fastify v5 REST API (TypeScript, Drizzle ORM, PostgreSQL, Redis)
│   └── mobile/       Expo React Native app (Android + iOS)
├── infra/
│   ├── docker-compose.yml    Local Postgres + Redis
│   └── render/               Staging and production Render blueprints
├── scripts/
│   ├── android-fast.sh       Boot emulator + launch Expo in one step
│   ├── backup/               Postgres backup and restore
│   └── ops/                  Secret generation and validation
└── .github/workflows/
    ├── ci.yml                Typecheck + test pipeline
    ├── cd-image.yml          Docker image build → GHCR
    └── dr-drill.yml          Manual DR drill
```

## Tech stack

| Layer | Technology |
|---|---|
| API | Fastify v5, Node.js ≥22, TypeScript, Zod |
| DB | Drizzle ORM, PostgreSQL 16+ |
| Cache / rate-limit | Redis (ioredis), in-memory fallback |
| Mobile | Expo ~55, React Native 0.83, React 19 |
| Animations | react-native-reanimated 4 |
| Package manager | pnpm 10 (workspaces) |
| Tests | Vitest (API + mobile) |
| Observability | prom-client (Prometheus) |

---

## Prerequisites

- Node.js `>=22`, pnpm `>=10`
- Docker (for local Postgres + Redis)
- Android Studio + AVD (Android) or Xcode + Simulator (iOS/macOS)

---

## First-time setup

```bash
git clone <repo-url>
cd glitch-finance-app
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
pnpm db:up
pnpm --filter @glitch/api db:migrate
```

---

## Running locally

```bash
pnpm dev:android    # recommended — starts API + boots Android emulator + Expo
pnpm dev:api        # API only (hot-reload)
pnpm android:fast   # emulator + Expo Android
pnpm dev            # API + Expo (use Expo Go QR for device)
```

The dev scripts automatically start and wait for the database containers before launching the API.

---

## Dev auth flow

OTP delivery defaults to `console` mode — no email is sent.

1. Enter any email on the login screen and tap **Send OTP**.
2. Check the API terminal — the 6-digit code is printed there.
3. Enter it on the OTP screen to authenticate.

---

## Environment variables

Key variables to configure in `apps/api/.env`:

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://glitch:glitch@127.0.0.1:5432/glitch` | |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Optional — falls back to in-memory |
| `OTP_HASH_SECRET` | `change-me-in-production-otp-secret` | **Must change in production** |
| `OTP_PROVIDER` | `console` | `console` or `resend` |
| `RESEND_API_KEY` | _(empty)_ | Required when `OTP_PROVIDER=resend` |
| `ALERTS_WEBHOOK_URL` | _(empty)_ | Recommended in staging/production for operational alerts |
| `ALERTS_COOLDOWN_SECONDS` | `60` | Cooldown for duplicate alert fingerprints |
| `SLO_MONITOR_ENABLED` | `false` | Enables rolling-window SLO alert checks |
| `SLO_MONITOR_WINDOW_SECONDS` | `300` | SLO window size in seconds |
| `SLO_MONITOR_EVALUATION_SECONDS` | `30` | SLO evaluation interval in seconds |
| `SLO_HTTP_5XX_RATE_THRESHOLD_PERCENT` | `2` | 5xx rate threshold percentage for SLO alert |
| `SLO_HTTP_5XX_MIN_REQUESTS` | `100` | Minimum request volume before 5xx SLO alerting |
| `SLO_OTP_DELIVERY_FAILURE_THRESHOLD` | `5` | OTP delivery failure threshold within SLO window |
| `SMS_IMPORT_SCAN_ENABLED` | `false` | Keeps SMS scan service disabled unless explicitly enabled |

Mobile: set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env`. Use `http://10.0.2.2:4000` for Android emulator, `http://<LAN-IP>:4000` for a physical device.

Full variable reference: [`docs/ops-runbook.md`](./docs/ops-runbook.md)

---

## Commands

```bash
# Database
pnpm db:up                               # start Postgres + Redis
pnpm db:down                             # stop containers
pnpm db:check                            # fail if schema has uncommitted migrations
pnpm --filter @glitch/api db:migrate     # apply pending migrations
pnpm --filter @glitch/api db:generate    # generate migration from schema changes

# Quality
pnpm typecheck                           # type-check all workspaces
pnpm lint                                # lint all workspaces
pnpm --filter @glitch/api test           # API unit + integration tests
pnpm --filter @glitch/mobile test        # mobile unit tests

# Operations
pnpm secrets:otp                         # generate a secure OTP_HASH_SECRET
pnpm secrets:validate                    # validate production-required secrets
pnpm backup:create                       # Postgres backup
```

---

## API

Base URL: `http://localhost:4000`. All protected routes require `Authorization: Bearer <token>`.

Modules: `auth`, `categories`, `transactions`, `budgets`, `goals`, `reports`, `consents`, `imports`, `account`, `metrics`

Full contracts: [`docs/api-reference.md`](./docs/api-reference.md)

---

## CI/CD

- **CI** (`ci.yml`) — lint → typecheck → migration drift check → API tests → mobile tests. Runs on every push and PR to `main`.
- **CD** (`cd-image.yml`) — builds and pushes the API Docker image to GHCR on merge to `main`.
- **DR drill** (`dr-drill.yml`) — manual workflow: restores a Postgres backup and runs smoke tests.

---

## Deployment

Render blueprints in `infra/render/` (`staging.yaml`, `production.yaml`). Target shape: stateless API replicas from GHCR image, managed Postgres, managed Redis, TLS at edge.

Before first production deploy:
1. Run `pnpm secrets:otp` and set the output as `OTP_HASH_SECRET`.
2. Set `OTP_PROVIDER=resend` with a real `RESEND_API_KEY`.
3. Store all secrets in the environment's secret manager, not in `.env` files.

---

## Documentation

[`docs/`](./docs/README.md) — full documentation hub

| Doc | Description |
|---|---|
| [architecture.md](./docs/architecture.md) | Module map, request lifecycle, routing model |
| [api-reference.md](./docs/api-reference.md) | Full endpoint contracts |
| [data-model.md](./docs/data-model.md) | DB schema, relations, migrations |
| [ui-style-guide.md](./docs/ui-style-guide.md) | Glitch Midnight design system |
| [ui-screens.md](./docs/ui-screens.md) | Per-screen component contracts |
| [security.md](./docs/security.md) | Auth, audit logging, production hardening |
| [testing.md](./docs/testing.md) | Test strategy and coverage |
| [ops-runbook.md](./docs/ops-runbook.md) | Full env vars, startup, backup, troubleshooting |
| [platform-readiness.md](./docs/platform-readiness.md) | CI/CD, infra, monitoring, DR |
