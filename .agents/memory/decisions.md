updated_by: Codex
updated_at: 2026-03-29
---

# Key Decisions Log

## Architecture

| Decision | Choice | Rationale |
|---|---|---|
| Routing model | Manual tab routing via `activeTab` state in App.tsx | No React Navigation — keeps mobile lightweight |
| Auth | Email OTP → session token → SecureStore | No passwords, simpler onboarding with stronger mobile secret storage |
| Google OAuth rollout | Keep disabled by default until a nonce-safe client flow is available | Current Expo Go / native setup does not yet provide a shippable end-to-end nonce-bound Google path |
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
| Action feedback model | Centralized toast bus + global viewport | Consistent UX, less duplicated inline/error UI logic |
| Toast placement | Bottom-safe with dynamic offset above tab bar | Avoid status bar overlap and avoid collision with floating navigation |
| Destructive confirmation pattern | Keep `Alert.alert` confirms, use toast for post-action result | Clear user intent confirmation + consistent non-blocking feedback |
| Regional dataset source | `country-state-city` for country/city options | Broader global coverage than static local lists |

## Infrastructure

| Decision | Choice | Rationale |
|---|---|---|
| Package manager | pnpm workspaces | Disk efficient, strict dependency isolation |
| Security patching | Direct patch bumps first, `pnpm.overrides` for stable transitive fixes | Clears advisories without forcing broad framework churn |
| Container registry | GHCR | Free, integrated with GitHub Actions |
| Deploy target | Render | Simple, managed Postgres + Redis |
| Active staging hostname | Use the Render default hostname until custom DNS is verified live | Avoid blocked rollout on unresolved `staging.quantex25.app` |
| DATABASE_URL host | 127.0.0.1 not localhost | Avoid IPv6 (::1) resolution on Linux |
| Cross-network mobile dev | Tailscale + Expo Go LAN mode | Stable across networks without relying on Expo/ngrok or Cloudflare quick tunnels |
| Hosted staging mobile testing | Root `pnpm dev:staging` launches Expo Go against the hosted Render backend | Keep staging app validation as simple as local dev, without local API dependencies |
| Public asset origin | `PUBLIC_API_BASE_URL` over request forwarded headers | Prevent host-header poisoning in stored avatar URLs |
| Hosted avatar file storage | Default to system temp dir unless `AVATAR_STORAGE_DIR` is explicitly set | Render containers may not allow writes under `/app`; avatar uploads need a writable runtime path |
| Production observability exposure | `/health` public, `/api/v1/status` and `/api/v1/metrics` gated by env | Reduce recon surface in production |
| Fresh hosted DB bootstrap | Apply Drizzle runtime migrations before app context seeding | Brand-new staging/prod databases must not fail before tables exist |

## Testing

| Decision | Choice | Rationale |
|---|---|---|
| Test runner | Vitest | Fast, ESM-native, compatible with Drizzle |
| DB in tests | Real Postgres (not mocked) | Learned from past migration mismatch incident |
| Coverage target | 80% minimum, 100% for auth/finance logic | Risk-proportionate |
