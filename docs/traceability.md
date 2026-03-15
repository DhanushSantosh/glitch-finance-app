# MVP Traceability (SRS → Implementation)

Sprint delivery reference: Sprint 1.1 through MVP completion.

## Implemented

### Core Finance Flows

- **FR-010, FR-011, FR-012, FR-013**: Manual transaction CRUD and filtered/paginated listing.
- **FR-030, FR-031**: Deterministic auto-categorization baseline with correction-learning via historical user edits.
- **FR-032**: Custom category create/update/delete (Category Studio). Default categories remain immutable.
- **FR-040, FR-041**: Monthly category budgets with live spent and remaining aggregation.
- **FR-042**: Savings goals create/update/delete with progress tracking and completion state.
- **FR-043**: Dashboard summary with monthly net flow, top spending categories, and daily trend chart.
- **FR-044**: Report export endpoints for CSV and PDF.

### Auth and Account Lifecycle

- **FR-001** (partial): Email OTP implemented; phone OTP deferred.
- **FR-003**: Account recovery via dedicated OTP recovery endpoints.
- **FR-004**: Account deletion endpoint and mobile settings action.
- **FR-060** (partial): Session continuity on same device via persisted token.

### Privacy and Consent

- **FR-020**: SMS detection disabled by default.
- **FR-021, FR-022** (partial): Consent intent path and disclosure version surfaced via bootstrap and settings.
- **FR-023, FR-025** (partial): Explicit-trigger SMS scan API and minimal-field extraction service implemented, gated by consent + disabled-by-default feature flag.

### Non-Functional

- **NFR-030**: Modular Fastify backend with strict TypeScript typing throughout.
- **NFR-024** (partial): Consent and mutation audit logging for auth events and all finance mutations (transactions, categories).
- **NFR-012** (partial): Idempotency-key protection for authenticated mutation retries (create/update/delete finance writes).

## Partially Implemented (Deliberate Deferrals)

- **FR-001**: Phone OTP deferred.
- **FR-026**: Intent and server-side consent modeled; platform-level permission revocation flow deferred.
- **FR-060**: Cross-device sync beyond token-backed auth deferred.

## Deferred Beyond MVP

- SMS auto-read ingestion and stored import lifecycle (FR-024, FR-027).
- AI insight generation.
- Subscription entitlement enforcement.
- Full managed cloud backup policy per production environment.

## Validation Evidence

### API Unit Tests

| File | Coverage |
|---|---|
| `apps/api/src/modules/auth/otp-policy.test.ts` | OTP expiry and attempt policy |
| `apps/api/src/modules/transactions/validation.test.ts` | Transaction input normalization |
| `apps/api/src/modules/budgets/validation.test.ts` | Budget month/amount validation |
| `apps/api/src/modules/goals/validation.test.ts` | Goal name/amount validation |
| `apps/api/src/modules/reports/validation.test.ts` | Report query parameter validation |

### API Integration Tests

| File | Coverage |
|---|---|
| `apps/api/src/integration/auth-transactions.integration.test.ts` | OTP lifecycle, transaction CRUD, category CRUD, auto-categorization, account deletion, recovery flow |
| `apps/api/src/integration/reports.integration.test.ts` | Report summary correctness, export contracts, cross-user isolation |
| `apps/api/src/integration/budgets-goals.integration.test.ts` | Budget/goal CRUD, spend aggregation, cross-user isolation |
| `apps/api/src/integration/contracts.integration.test.ts` | Strict response/error envelope contract checks |
| `apps/api/src/integration/imports.integration.test.ts` | SMS scan endpoint default-disable guardrail |

### Mobile Unit Tests

| File | Coverage |
|---|---|
| `apps/mobile/src/flow/mobileFlow.test.ts` | Auth stage transitions, SMS intent guardrail |
| `apps/mobile/src/navigation/routes.test.ts` | Route integrity |
| `apps/mobile/src/theme/tokens.test.ts` | Theme token completeness |
| `apps/mobile/src/screens/styleGuard.test.ts` | Block raw hex colors in screen files |
| `apps/mobile/src/utils/*.test.ts` | Format, month, budgetTotals, statusTone helpers |

### Manual Validation

```bash
pnpm dev:android   # full-stack emulator run
```
