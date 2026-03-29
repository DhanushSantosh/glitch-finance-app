# Glitch Docs

All files use lowercase kebab-case names. Update docs in the same PR as the code change.

## Product

| File | What's in it |
|---|---|
| [requirements.md](./requirements.md) | Product requirements and feature scope |
| [traceability.md](./traceability.md) | SRS → implementation mapping and MVP validation |

## Design

| File | What's in it |
|---|---|
| [ui-style-guide.md](./ui-style-guide.md) | Glitch Midnight tokens, typography, motion, and component patterns |
| [ui-screens.md](./ui-screens.md) | Per-screen structure and component contracts |

## Engineering

| File | What's in it |
|---|---|
| [architecture.md](./architecture.md) | Module map, request lifecycle, routing and data flow |
| [api-reference.md](./api-reference.md) | Full request/response contracts for every endpoint |
| [data-model.md](./data-model.md) | DB schema, relations, indexes, and migration workflow |
| [regionalization.md](./regionalization.md) | Timezone/currency/locale behavior, defaults, and implementation details |

## Operations

| File | What's in it |
|---|---|
| [dev-setup.md](./dev-setup.md) | First-time local setup for API and mobile |
| [ops-runbook.md](./ops-runbook.md) | Env vars, startup, backup/restore, secrets rotation, troubleshooting |
| [platform-readiness.md](./platform-readiness.md) | CI/CD pipeline, infra provisioning, monitoring, and DR baseline |
| [project-health.md](./project-health.md) | Current maintenance snapshot, verification status, and next ops/product priorities |
| [security.md](./security.md) | Auth controls, audit logging, data isolation, production hardening |
| [testing.md](./testing.md) | Test strategy, coverage map, and acceptance scenarios |

## Standards

- API changes → update `api-reference.md` + `testing.md`
- Schema changes → update `data-model.md` + include a migration
- Security-sensitive changes → update `security.md`
- UI system changes → update `ui-style-guide.md`
