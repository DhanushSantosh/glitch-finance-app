# Execution Worklist (Completed)

This file tracks the requested implementation batch and completion state.

## Product and MVP Features

- [x] Fix mobile typecheck blocker from UI merge (`BottomTabBar` reanimated typings).
- [x] Custom category management:
  - API: create/update/delete user categories.
  - Mobile: Category Studio screens and settings entry point.
  - Guardrails: default categories remain immutable.
- [x] Deterministic auto-categorization baseline:
  - Keyword rules.
  - User correction learning via historical transactions.
- [x] Report export support:
  - `GET /api/v1/reports/export?format=csv|pdf`.
  - CSV and PDF attachment responses.
- [x] Account lifecycle gaps:
  - Recovery OTP aliases.
  - Account deletion endpoint and mobile action.

## Platform and Operations

- [x] Real OTP email provider integration:
  - `OTP_PROVIDER=console|resend`.
  - Resend delivery provider with env-driven config.
- [x] CI/CD extension:
  - Existing quality CI retained.
  - API image build/publish workflow (`cd-image.yml`) added.
- [x] Staging/production provisioning artifacts:
  - Render blueprints for staging and production.
  - API Dockerfile for deployment.
- [x] Monitoring baseline:
  - Prometheus metrics endpoint (`/api/v1/metrics`).
- [x] Backup/restore automation + DR drill:
  - Backup and restore scripts.
  - Manual DR drill GitHub workflow.
- [x] Secrets rotation tooling:
  - OTP secret generator script.

## Validation

- [x] Workspace typecheck passes.
- [x] API tests pass.
- [x] Mobile tests pass.

