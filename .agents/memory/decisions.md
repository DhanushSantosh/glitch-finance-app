updated_by: Codex
updated_at: 2026-03-16
---

# Key Decisions Log

## Architecture

| Decision | Choice | Rationale |
|---|---|---|
| Routing model | Manual tab routing via `activeTab` state in App.tsx | No React Navigation — keeps mobile lightweight |
| Auth | Email OTP → session token → AsyncStorage | No passwords, simpler onboarding |
| OTP delivery | ConsoleOtpProvider (dev) / ResendOtpProvider (prod) | Env-switched, no code changes needed |
| Rate limiting | Redis-backed with in-memory fallback | Redis optional — app works without it |
| Default categories | Seeded at startup, immutable to users | Consistent baseline for all users |
| Auto-categorization | Keyword rules + counterparty history | Deterministic, no ML dependency |
| DB cascade | Postgres ON DELETE CASCADE | Account deletion is one query, no app-level cleanup |

## API

| Decision | Choice | Rationale |
|---|---|---|
| Session cap | 5 concurrent sessions max, oldest evicted | Prevent session sprawl, security |
| Audit log | Immutable append-only table | Tamper-resistant, compliance |
| Report export | CSV + PDF from same data | Two formats, one endpoint |
| Transaction direction | debit / credit / transfer enum | Clear, no ambiguity |
| Mutation retry safety | Header-based idempotency (`Idempotency-Key`) + response replay cache | Prevent duplicate writes on network retries |
| Client error normalization | Map Fastify parser and common Postgres constraint errors to stable 4xx envelopes | Avoid unexpected 500s for client/input faults |

## Mobile

| Decision | Choice | Rationale |
|---|---|---|
| State location | All state in App.tsx | Simple, no Redux/Context overhead |
| Sync strategy | Optimistic updates + reconcile after 700ms | Snappy UX, eventual consistency |
| Background sync | 15s interval + AppState listener | Fresh data without hammering API |
| BottomTabBar | BlurView + spring-animated pill | Premium feel, "Glitch Midnight" brand |
| Safe area handling | Global `SafeAreaProvider` + top/side `SafeAreaView` in app shell | Prevent iOS notch/status-bar overlap across flows |

## Infrastructure

| Decision | Choice | Rationale |
|---|---|---|
| Package manager | pnpm workspaces | Disk efficient, strict dependency isolation |
| Container registry | GHCR | Free, integrated with GitHub Actions |
| Deploy target | Render | Simple, managed Postgres + Redis |
| DATABASE_URL host | 127.0.0.1 not localhost | Avoid IPv6 (::1) resolution on Linux |

## Testing

| Decision | Choice | Rationale |
|---|---|---|
| Test runner | Vitest | Fast, ESM-native, compatible with Drizzle |
| DB in tests | Real Postgres (not mocked) | Learned from past migration mismatch incident |
| Coverage target | 80% minimum, 100% for auth/finance logic | Risk-proportionate |
