# API Reference (Sprint 1.1)

Base URL: `http://localhost:4000`

## Conventions

### Authentication

Use bearer token after OTP verification:

```http
Authorization: Bearer <session_token>
```

### Error Envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": {}
  },
  "requestId": "req-123"
}
```

## Health and Bootstrap

### `GET /health`

Returns API liveness.

### `GET /api/v1/status`

Returns runtime status, dependency configuration flags, and live dependency health.

### `GET /api/v1/bootstrap`

Returns app config and feature flags.

Key guarantee:

- `featureFlags.smsImportEnabledByDefault` is always `false` in Sprint 1.1.

## Authentication

### `POST /api/v1/auth/request-otp`

Request body:

```json
{
  "email": "user@example.com"
}
```

Response:

```json
{
  "message": "If this email is valid, an OTP has been sent."
}
```

Non-production addition (`NODE_ENV !== production`): includes `debugOtpCode` for local testing.

### `POST /api/v1/auth/verify-otp`

Request body:

```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

Response:

```json
{
  "token": "session-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "expiresInDays": 30
  }
}
```

### `POST /api/v1/auth/logout`

Requires auth. Revokes active session.

### `GET /api/v1/me`

Requires auth. Returns current user identity.

## Categories

### `GET /api/v1/categories`

Requires auth. Returns default categories and user-specific categories.

Response:

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Food & Dining",
      "direction": "debit",
      "isDefault": true
    }
  ]
}
```

## Transactions

### `GET /api/v1/transactions`

Requires auth.

Query parameters:

- `page` (default `1`)
- `pageSize` (default `20`, max `100`)
- `direction` (`debit|credit|transfer`)
- `categoryId`
- `from` (ISO datetime)
- `to` (ISO datetime)
- `sortBy` (`occurredAt|amount`, default `occurredAt`)
- `sortOrder` (`asc|desc`, default `desc`)

Response includes:

- `items`: transaction list for current page
- `pagination.page`
- `pagination.pageSize`
- `pagination.hasMore`
- `pagination.nextPage`

### `POST /api/v1/transactions`

Requires auth.

Request body:

```json
{
  "direction": "debit",
  "amount": 520.45,
  "currency": "INR",
  "categoryId": "uuid",
  "counterparty": "Metro Store",
  "note": "Snacks",
  "occurredAt": "2026-03-11T15:00:00.000Z"
}
```

### `PATCH /api/v1/transactions/:id`

Requires auth. Partial update accepted.

### `DELETE /api/v1/transactions/:id`

Requires auth. Deletes only if owned by authenticated user.

## Reports

### `GET /api/v1/reports/summary`

Requires auth.

Query parameters:

- `month` (`YYYY-MM`, default current UTC month)
- `currency` (3-char ISO code, default `APP_CURRENCY`)
- `top` (number of top debit categories, default `5`, max `10`)

Response includes:

- `totals`: income, expense, transfer, net, transactionCount for selected month/currency
- `topCategories`: top debit categories by spend
- `dailySeries`: date-wise income/expense/net rows across the month window
- `period`: resolved UTC start and endExclusive boundaries used for aggregation

## Budgets

### `GET /api/v1/budgets?month=YYYY-MM`

Requires auth.

Response includes:

- Per-category budget amount
- Month spend aggregation from debit transactions
- Remaining amount and utilization percentage
- Month totals summary

### `POST /api/v1/budgets`

Requires auth.

Request body:

```json
{
  "categoryId": "uuid",
  "month": "2026-03",
  "amount": 2000,
  "currency": "INR"
}
```

Budgets are constrained to debit categories and upserted by `(user, category, month)`.

### `PATCH /api/v1/budgets/:id`

Requires auth. Partial update accepted.

### `DELETE /api/v1/budgets/:id`

Requires auth. Deletes only if owned by authenticated user.

## Goals

### `GET /api/v1/goals`

Requires auth.

Returns goal list ordered by latest update with progress and completion state.

### `POST /api/v1/goals`

Requires auth.

Request body:

```json
{
  "name": "Emergency Fund",
  "targetAmount": 50000,
  "currentAmount": 10000,
  "currency": "INR",
  "targetDate": "2026-12-31T00:00:00.000Z"
}
```

### `PATCH /api/v1/goals/:id`

Requires auth. Partial update accepted.

### `DELETE /api/v1/goals/:id`

Requires auth. Deletes only if owned by authenticated user.

## SMS Consent Guardrail

### `GET /api/v1/consents/sms-import`

Requires auth. Returns current consent snapshot.

### `POST /api/v1/consents/sms-import-intent`

Requires auth.

Request body:

```json
{
  "enabled": true
}
```

Behavior:

- Logs user intent.
- Returns `featureAvailable: false`.
- Keeps `enabled: false` in Sprint 1.1.

## Rate Limits (Auth)

- Request OTP and Verify OTP routes are rate-limited by IP and email.
- Redis is primary store; in-memory fallback is used if Redis is unavailable.
