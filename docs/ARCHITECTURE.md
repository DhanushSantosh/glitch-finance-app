# Architecture

## System Overview

Glitch is a mobile-first finance tracker with a modular Fastify backend and Expo React Native client.

```text
[React Native App]
   -> HTTPS/JSON
[Fastify API]
   -> [PostgreSQL]
   -> [Redis]
```

## Current Runtime Components

### Mobile (`apps/mobile`)

- Expo React Native app for Android/iOS.
- Session token persisted with AsyncStorage.
- Screens implemented in Sprint 1.1:
  - Dashboard (monthly summary + top categories + daily net trend)
  - Login
  - OTP Verify
  - Transactions List
  - Add/Edit Transaction
  - Budgets List
  - Budget Create/Edit
  - Goals List
  - Goal Create/Edit
  - Settings (SMS intent logging only)
  - Category Studio (custom category CRUD)

### API (`apps/api`)

- Fastify modular monolith with strict module boundaries.
- Drizzle ORM + Postgres for persistence.
- Redis-backed rate limiting with in-memory fallback.

Implemented modules:

- `health` - health/status/bootstrap endpoints.
- `auth` - email OTP, session issuance, logout, identity resolution.
- `categories` - default/user listing plus custom category CRUD.
- `transactions` - user-scoped CRUD, filters, and deterministic auto-categorization baseline.
- `reports` - monthly dashboard summary with totals, top debit categories, daily trend series, and export.
- `budgets` - monthly per-category budgets with spent aggregation from transactions.
- `goals` - savings goal tracking with progress and completion state.
- `consents` - SMS import consent state and intent logging.
- `audit` - immutable audit event writes.
- `metrics` - Prometheus metrics endpoint for observability.

## Request Lifecycle

1. Client sends request with optional `Authorization: Bearer <token>`.
2. `onRequest` hook resolves session and injects `request.auth`.
3. Route-level Zod validation enforces typed boundaries.
4. Module service executes DB operations with ownership checks.
5. Audit events persist mutation and security events.
6. Unified error handler returns structured error envelope.

## Data and Security Boundaries

- App enforces user isolation by `user_id` on all transaction mutations and reads.
- OTP values are never stored in plain text, only hashed.
- Session tokens are stored as hashed values server-side.
- SMS detection remains disabled by default and unavailable for actual ingestion in Sprint 1.1.
- Account deletion endpoint removes user-owned data via cascade constraints.

## Deployment Shape (Target)

- Stateless API containers behind a load balancer.
- Managed Postgres as source of truth.
- Managed Redis for low-latency rate limiting and queue-ready primitives.
- Separate worker service reserved for future asynchronous ingestion and AI processing.
