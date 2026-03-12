# Testing Strategy

## Current Automated Coverage

### API Unit Tests

- OTP expiry and attempt policy logic.
- Transaction validation and normalization rules.
- Budget validation rules:
  - `YYYY-MM` month format
  - positive amount and valid currency shape
  - non-empty patch payload enforcement
- Goal validation rules:
  - minimum name length
  - positive target amount and non-negative current amount

### API Integration Tests

- OTP request/verify/login/logout lifecycle.
- Transaction CRUD and user isolation.
- Transaction list sorting and pagination semantics.
- Report summary correctness and cross-user isolation.
- Budget CRUD, per-month spend aggregation, and cross-user isolation.
- Savings goals CRUD and cross-user isolation.
- Bootstrap policy checks for SMS disabled default.

### Mobile Unit Tests

- Auth stage transitions (login -> otp -> authenticated).
- SMS intent guardrail behavior.
- Transaction input validity checks.
- Budget month token derivation helper for month-scoped queries.
- Theme token and navigation route integrity checks.
- Screen style guard to block raw hex colors in screen files.

## Commands

From repo root:

```bash
pnpm typecheck
pnpm --filter @glitch/api test
pnpm --filter @glitch/mobile test
```

## Acceptance Scenarios (Sprint 1.1)

1. New user can request OTP, verify OTP, and get authenticated.
2. Authenticated user can create, update, delete own transactions.
3. User cannot access or mutate another user’s transactions.
4. Authenticated user sees monthly dashboard summary with income/expense/net and top categories.
5. Authenticated user can create, update, delete monthly category budgets and see spent/remaining values.
6. Authenticated user can create, update, delete savings goals and view progress state.
7. Settings SMS action logs intent but keeps feature disabled.

## Recommended Next-Level Test Additions

1. Add UI component tests for screen rendering and interaction events.
2. Add end-to-end mobile flow tests on emulator.
3. Add API performance smoke tests for transactions list/write endpoints.
