# Glitch Finance App

A mobile-first personal finance tracker built for precision. Glitch lets users log transactions, track category-wise monthly budgets, monitor savings goals, and view monthly financial summaries — all behind a secure email OTP auth flow and a high-contrast dark UI.

## What's inside

```
glitch-finance-app/
├── apps/
│   ├── api/          Fastify v5 REST API (TypeScript, Drizzle ORM, PostgreSQL, Redis)
│   └── mobile/       Expo React Native app (Android + iOS)
├── infra/
│   ├── docker-compose.yml    Local Postgres + Redis containers
│   └── render/               Staging and production Render blueprint manifests
├── scripts/
│   ├── android-fast.sh       Boot emulator + launch Expo in one step
│   ├── backup/               Postgres backup and restore scripts
│   └── ops/                  OTP secret generator
└── .github/workflows/
    ├── ci.yml                Typecheck + test pipeline
    ├── cd-image.yml          API Docker image build and push to GHCR
    └── dr-drill.yml          Manual disaster recovery drill
```

## Tech stack

| Layer | Technology |
|---|---|
| API runtime | Fastify v5, Node.js ≥22, TypeScript |
| ORM + DB | Drizzle ORM, PostgreSQL 16+ |
| Rate limiting | Redis (ioredis), in-memory fallback |
| Validation | Zod |
| Mobile | Expo ~55, React Native 0.83, React 19 |
| Animations | react-native-reanimated 4 |
| Icons | lucide-react-native |
| Charts | react-native-svg |
| Package manager | pnpm 10 (workspaces) |
| Test runner | Vitest (both workspaces) |
| Observability | prom-client (Prometheus metrics) |

---

## Prerequisites

- Git
- Node.js `>=22`
- pnpm `>=10` — install with `npm i -g pnpm`
- Docker Desktop (or Docker Engine + Compose) — for local Postgres and Redis
- **Android**: Android Studio with Android SDK and an AVD emulator configured
- **iOS** (macOS only): Xcode with Command Line Tools and iOS Simulator

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

## Environment variables

### API — `apps/api/.env`

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Runtime environment |
| `API_PORT` | `4000` | Port the API listens on |
| `API_HOST` | `0.0.0.0` | Bind host |
| `MOBILE_APP_ORIGIN` | `http://localhost:8081` | CORS allowed origin for the mobile dev server |
| `DATABASE_URL` | `postgresql://glitch:glitch@localhost:5432/glitch` | Postgres connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string (optional — falls back to in-memory) |
| `OTP_HASH_SECRET` | `change-me-in-production-otp-secret` | HMAC secret for hashing OTP values. **Must be changed in production.** |
| `OTP_PROVIDER` | `console` | OTP delivery mode: `console` (logs to terminal) or `resend` (real email) |
| `OTP_EMAIL_FROM` | `Glitch Finance <noreply@example.com>` | Sender address used by Resend provider |
| `RESEND_API_KEY` | _(empty)_ | Required when `OTP_PROVIDER=resend` |
| `ALERTS_WEBHOOK_URL` | _(empty)_ | Optional webhook URL for server error/OTP delivery alerts |
| `ALERTS_COOLDOWN_SECONDS` | `60` | Minimum repeat interval for identical alerts |
| `AUTH_OTP_TTL_SECONDS` | `300` | OTP code expiry window (5 minutes) |
| `AUTH_MAX_OTP_ATTEMPTS` | `5` | Max verification attempts before OTP is invalidated |
| `AUTH_SESSION_TTL_DAYS` | `30` | Session token lifetime |
| `AUTH_MAX_ACTIVE_SESSIONS` | `5` | Maximum concurrently active sessions per user (oldest sessions are revoked on new login) |
| `AUTH_RATE_LIMIT_WINDOW_SECONDS` | `900` | Rate-limit sliding window (15 minutes) |
| `AUTH_RATE_LIMIT_MAX_REQUEST_OTP` | `5` | Max OTP requests per window per email+IP |
| `AUTH_RATE_LIMIT_MAX_VERIFY_OTP` | `10` | Max verify attempts per window per email+IP |
| `SMS_DISCLOSURE_VERSION` | `sms_disclosure_v1` | Legal consent version string surfaced via bootstrap |
| `APP_CURRENCY` | `INR` | Default currency for reports and budgets |

### Mobile — `apps/mobile/.env`

| Variable | Default | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:4000` | Base URL of the API the mobile app connects to |

**Platform-specific API URL:**

| Target | Value |
|---|---|
| iOS Simulator / web | `http://localhost:4000` |
| Android emulator | `http://10.0.2.2:4000` |
| Physical device (LAN) | `http://<your-machine-LAN-ip>:4000` |

Restart Expo after changing this value.

---

## Running locally

**Full stack — recommended:**

```bash
pnpm dev:android    # starts API + boots Android emulator + launches Expo
```

**Split terminals:**

```bash
pnpm dev:api        # API only (hot-reload via tsx watch)
pnpm android:fast   # boots emulator + launches Expo on Android
```

**Other options:**

```bash
pnpm dev            # API + Expo (no forced Android launch, use Expo Go QR)
pnpm dev:mobile     # Expo only (API must be running separately)
```

---

## Dev auth flow

In development, OTP delivery is set to `console` mode — no email is sent.

1. Enter any email on the login screen and tap **Send OTP**.
2. **Check the API terminal** — the 6-digit OTP is printed there.
3. Enter the code on the OTP screen to authenticate.

To test real email delivery locally, set `OTP_PROVIDER=resend` and add your `RESEND_API_KEY`.

---

## Commands reference

### Development

```bash
pnpm dev:android               # recommended full-stack start
pnpm dev:api                   # API with hot-reload
pnpm dev:mobile                # Expo dev server
pnpm android:fast              # emulator boot + Expo Android launch
pnpm android:emulator          # emulator boot only
```

### Database

```bash
pnpm db:up                                        # start Postgres + Redis containers
pnpm db:down                                      # stop containers
pnpm db:logs                                      # tail container logs
pnpm --filter @glitch/api db:migrate              # apply pending migrations
pnpm --filter @glitch/api db:generate             # generate migration from schema changes
pnpm db:check                                     # fail if schema changes are missing committed migrations
```

### Testing and type-checking

```bash
pnpm typecheck                                    # type-check all workspaces
pnpm --filter @glitch/api test                    # API unit + integration tests
pnpm --filter @glitch/mobile test                 # mobile unit tests
```

### Operations

```bash
pnpm secrets:otp                                  # generate a high-entropy OTP_HASH_SECRET value
pnpm secrets:validate                             # validate required runtime secrets (production requires ALERTS_WEBHOOK_URL)
pnpm backup:create                                # create a Postgres backup (requires DATABASE_URL set)
./scripts/backup/postgres-restore.sh <file.dump>  # restore from a backup file
```

---

## API endpoints

Base URL: `http://localhost:4000`

All protected routes require `Authorization: Bearer <token>`.

### System

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Liveness check |
| GET | `/api/v1/status` | No | Runtime status + dependency health |
| GET | `/api/v1/bootstrap` | No | App config and feature flags |
| GET | `/api/v1/metrics` | No | Prometheus scrape endpoint |

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/request-otp` | No | Request OTP for email |
| POST | `/api/v1/auth/verify-otp` | No | Verify OTP, receive session token |
| POST | `/api/v1/auth/recovery/request-otp` | No | Recovery OTP request |
| POST | `/api/v1/auth/recovery/verify-otp` | No | Recovery OTP verify |
| POST | `/api/v1/auth/logout` | Yes | Revoke current session |
| GET | `/api/v1/me` | Yes | Current user identity |
| DELETE | `/api/v1/account` | Yes | Permanently delete account and all data |

### Categories

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/categories` | Yes | List default + user-owned categories |
| POST | `/api/v1/categories` | Yes | Create custom category |
| PATCH | `/api/v1/categories/:id` | Yes | Update user-owned category |
| DELETE | `/api/v1/categories/:id` | Yes | Delete user-owned category |

### Transactions

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/transactions` | Yes | Paginated list with filters (`direction`, `categoryId`, `from`, `to`, `sortBy`, `sortOrder`, `page`, `pageSize`) |
| POST | `/api/v1/transactions` | Yes | Create transaction (auto-categorization applied when `categoryId` omitted) |
| PATCH | `/api/v1/transactions/:id` | Yes | Update transaction |
| DELETE | `/api/v1/transactions/:id` | Yes | Delete transaction |

### Reports

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/reports/summary` | Yes | Monthly summary: totals, top categories, daily series (`?month=YYYY-MM`) |
| GET | `/api/v1/reports/export` | Yes | Download report as CSV or PDF (`?format=csv\|pdf&month=YYYY-MM`) |

### Budgets

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/budgets` | Yes | Monthly budgets with live spend aggregation (`?month=YYYY-MM`) |
| POST | `/api/v1/budgets` | Yes | Create budget plan |
| PATCH | `/api/v1/budgets/:id` | Yes | Update budget |
| DELETE | `/api/v1/budgets/:id` | Yes | Delete budget |

### Goals

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/goals` | Yes | List savings goals with progress |
| POST | `/api/v1/goals` | Yes | Create goal |
| PATCH | `/api/v1/goals/:id` | Yes | Update goal (use to contribute amounts) |
| DELETE | `/api/v1/goals/:id` | Yes | Delete goal |

### Consents

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/consents/sms-import` | Yes | Current SMS consent state |
| POST | `/api/v1/consents/sms-import-intent` | Yes | Log SMS feature intent (feature remains disabled) |

---

## Health checks

```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/v1/status      # includes database and Redis health flags
curl http://localhost:4000/api/v1/bootstrap   # feature flags and app config
curl http://localhost:4000/api/v1/metrics     # Prometheus metrics
```

---

## CI/CD

### CI — `ci.yml`

Runs on every push and pull request to `main`:

1. Install dependencies
2. Workspace lint
3. Workspace typecheck
4. Migration drift check (`pnpm db:check`)
5. API test suite (runs migrations against test DB)
6. Mobile test suite

Merges to `main` are expected to be green.

### CD — `cd-image.yml`

Builds and pushes the API Docker image to GitHub Container Registry on push to `main`.

Image source: `apps/api/Dockerfile`

### DR drill — `dr-drill.yml`

Manual GitHub Actions workflow for disaster recovery validation — restores a Postgres backup to an isolated environment and runs smoke tests.

---

## Deployment

Render blueprint manifests are in `infra/render/`:

- `staging.yaml` — staging environment
- `production.yaml` — production environment

Target runtime shape:

- Stateless API service replicas (Docker image from GHCR)
- Managed PostgreSQL
- Managed Redis (rate-limit state and future queueing)
- HTTPS ingress with TLS at edge

**Before first production deploy:**

1. Set `OTP_HASH_SECRET` to a securely generated value (`pnpm secrets:otp`).
2. Set `OTP_PROVIDER=resend` with a real `RESEND_API_KEY` and `OTP_EMAIL_FROM`.
3. Store all secrets in the environment's secret manager — not `.env` files.
4. Enable automated database backups with point-in-time recovery.

---

## Key behaviors

**Auto-categorization**: When a transaction is created without an explicit `categoryId`, the API applies deterministic keyword rules and learns from the user's correction history (prior categorizations of the same counterparty). If no match is found, the transaction is left uncategorized.

**Category guardrails**: Default categories (seeded at startup) are immutable — user create/update/delete operations apply only to user-owned categories. Deleting a category that is in use by a budget plan returns a conflict error.

**Account deletion**: `DELETE /api/v1/account` removes the user and all owned data via Postgres cascade constraints. The session is immediately invalidated.

**SMS feature**: Disabled by default. The consent endpoint logs user intent only — no SMS content is ingested or stored.

---

## Documentation

Full documentation hub: [`docs/README.md`](./docs/README.md)

| Document | Description |
|---|---|
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | System design, module map, request lifecycle, routing model |
| [`docs/API_REFERENCE.md`](./docs/API_REFERENCE.md) | Full request/response contracts for every endpoint |
| [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md) | Database schema, relations, indexes, migration workflow |
| [`docs/UI_STYLE_GUIDE.md`](./docs/UI_STYLE_GUIDE.md) | Glitch Midnight design system — tokens, typography, motion, components |
| [`docs/UI_SCREEN_BLUEPRINTS.md`](./docs/UI_SCREEN_BLUEPRINTS.md) | Per-screen structure and component contracts |
| [`docs/SECURITY_PRIVACY.md`](./docs/SECURITY_PRIVACY.md) | Auth controls, data isolation, audit logging, production hardening |
| [`docs/TESTING.md`](./docs/TESTING.md) | Test strategy, coverage map, acceptance scenarios |
| [`docs/OPERATIONS_RUNBOOK.md`](./docs/OPERATIONS_RUNBOOK.md) | Startup, troubleshooting, env vars, backup/restore, secrets rotation |
| [`docs/PLATFORM_READINESS.md`](./docs/PLATFORM_READINESS.md) | CI/CD pipeline, infra provisioning, monitoring, DR baseline |
| [`docs/SPRINT1_TRACEABILITY.md`](./docs/SPRINT1_TRACEABILITY.md) | SRS requirement mapping and MVP validation evidence |
