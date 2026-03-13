# Glitch Documentation Hub

This folder is the source of truth for product and engineering documentation.

## Product and Scope

- `SRS_v1.md` - Product requirements and long-term scope.
- `SPRINT1_TRACEABILITY.md` - Mapping of Sprint 1.1 implementation to SRS requirements.
- `WORKLIST_EXECUTION.md` - Completed execution checklist for current delivery batch.
- `UI_STYLE_GUIDE.md` - Soft Aqua design system tokens, UX principles, and accessibility standards.
- `UI_SCREEN_BLUEPRINTS.md` - Per-screen structure and component contracts for mobile flows.

## Engineering

- `ARCHITECTURE.md` - System architecture, module boundaries, and runtime flows.
- `DATA_MODEL.md` - Database schema, relations, and migration process.
- `API_REFERENCE.md` - Request/response contracts for all current API endpoints.

## Security and Compliance

- `SECURITY_PRIVACY.md` - Auth, consent, SMS guardrails, and audit requirements.

## Quality and Validation

- `TESTING.md` - Test strategy, automation commands, and acceptance criteria.

## Development and Operations

- `LOCAL_DEV_SETUP.md` - Local setup for mobile and backend development.
- `OPERATIONS_RUNBOOK.md` - Environment config, runbook steps, and troubleshooting.
- `PLATFORM_READINESS.md` - CI/CD, infra provisioning, secrets, monitoring, and DR baseline.

## Documentation Standards

1. Update docs in the same PR as behavior or contract changes.
2. API changes must update `API_REFERENCE.md` and `TESTING.md` acceptance cases.
3. Schema changes must update `DATA_MODEL.md` and include a migration.
4. Security-sensitive changes must update `SECURITY_PRIVACY.md`.
