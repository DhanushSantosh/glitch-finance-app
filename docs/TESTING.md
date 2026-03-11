# Testing Strategy

## Current Automated Coverage

### API Unit Tests

- OTP expiry and attempt policy logic.
- Transaction validation and normalization rules.

### API Integration Tests

- OTP request/verify/login/logout lifecycle.
- Transaction CRUD and user isolation.
- Bootstrap policy checks for SMS disabled default.

### Mobile Unit Tests

- Auth stage transitions (login -> otp -> authenticated).
- SMS intent guardrail behavior.
- Transaction input validity checks.

## Commands

From repo root:

```bash
pnpm typecheck
pnpm --filter @glitch/api test
pnpm --filter @glitch/mobile test
```

## Acceptance Scenarios (Sprint 1)

1. New user can request OTP, verify OTP, and get authenticated.
2. Authenticated user can create, update, delete own transactions.
3. User cannot access or mutate another user’s transactions.
4. Settings SMS action logs intent but keeps feature disabled.

## Recommended Next-Level Test Additions

1. Add UI component tests for screen rendering and interaction events.
2. Add end-to-end mobile flow tests on emulator.
3. Add API performance smoke tests for transactions list/write endpoints.
