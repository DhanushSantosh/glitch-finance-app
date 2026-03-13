# Sprint 1.1 Traceability (SRS -> Implementation)

## Implemented in Sprint 1.1

- FR-010, FR-011, FR-012, FR-013: Manual transaction CRUD and filtered listing.
- FR-030, FR-031: Deterministic auto-categorization baseline with correction-learning via historical user edits.
- FR-032: Custom category create/update/delete support.
- FR-020: SMS detection disabled by default.
- FR-021, FR-022 (partial): Consent intent path and disclosure version surfaced via bootstrap/settings.
- FR-040, FR-041: Monthly category budgets with consumed and remaining values.
- FR-042: Savings goals create/update/delete with progress and completion state.
- FR-043 (partial): Dashboard summary with monthly net flow and top spending categories.
- FR-044: Reports export endpoints for CSV/PDF.
- FR-003: Recovery flow via dedicated OTP recovery endpoints.
- FR-004: Account deletion endpoint and mobile settings action.
- FR-060 (partial): Session continuity on same device via persisted token.
- NFR-030: Modular backend + strict TypeScript typing.
- NFR-024 (partial): Consent and mutation audit logging implemented for auth and finance mutations.

## Partially Implemented (deliberate)

- FR-001: Email OTP implemented; phone OTP deferred.
- FR-026: Intent and server-side state modeled; platform-level permission revocation flow deferred.
- FR-060: Cross-device sync support beyond token-backed auth is deferred.

## Deferred Beyond Sprint 1.1

- SMS parsing and extraction pipeline (FR-023, FR-024, FR-025, FR-027).
- AI insight generation.
- Subscription entitlement enforcement.
- Full managed cloud backup policy enablement per production environment.

## Validation Evidence

- API unit tests:
  - `apps/api/src/modules/auth/otp-policy.test.ts`
  - `apps/api/src/modules/transactions/validation.test.ts`
  - `apps/api/src/modules/budgets/validation.test.ts`
  - `apps/api/src/modules/goals/validation.test.ts`
- API integration tests:
  - `apps/api/src/integration/auth-transactions.integration.test.ts`
  - `apps/api/src/integration/reports.integration.test.ts`
  - `apps/api/src/integration/budgets-goals.integration.test.ts`
- Mobile flow unit tests:
  - `apps/mobile/src/flow/mobileFlow.test.ts`
- Manual emulator validation:
  - `pnpm dev:android`
