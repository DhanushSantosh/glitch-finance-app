updated_by: Codex
updated_at: 2026-03-29
---

# Project State

## What's Done

### API (apps/api)
- Fastify v5 REST API fully implemented and tested
- Modules: auth (OTP + session), categories, transactions, budgets, goals, reports (summary + export), imports (SMS), consents, audit, alerts, SLO monitor, metrics
- 184 API tests passing (unit + integration)
- Idempotent mutation protection implemented for authenticated write routes (transactions, budgets, goals, categories, consent intent)
- New persistence table for idempotency records: `idempotency_keys`
- Error normalization improved: Fastify JSON parser + Postgres constraint errors now map to stable 4xx envelopes where applicable
- Auth hardening: active session cap (AUTH_MAX_ACTIVE_SESSIONS=5), recovery OTP path, rate limiting
- Security hardening pass completed:
  - production startup now rejects placeholder `OTP_HASH_SECRET`
  - debug OTP exposure narrowed to explicit local/test configuration
  - profile `avatarUrl` can no longer be patched directly
  - avatar uploads are signature-validated and served with `nosniff`
  - trusted public avatar URLs derive from `PUBLIC_API_BASE_URL` / configured origin, not raw forwarded headers
  - `/api/v1/status` and `/api/v1/metrics` can be disabled per environment
  - proxy-aware IP handling now uses `TRUST_PROXY_HOPS`
  - Apple OAuth no longer trusts client-supplied email hints
  - Google OAuth remains disabled by default and backend nonce enforcement is in place for any future re-enable
- AlertsService wired to webhook (ALERTS_WEBHOOK_URL)
- SLO monitor with rolling-window evaluation
- Drizzle ORM migrations in place
- CI: lint → typecheck → db:check → API tests → mobile tests (all green)
- CD: Docker image → GHCR on push to main

### Mobile (apps/mobile)
- Expo SDK 55, React Native 0.83, React 19
- Screens: Dashboard, Transactions, TransactionForm, Budgets, BudgetForm, Goals, GoalForm, Settings, Login, OtpVerify, CategoryManagerScreen, CategoryFormScreen
- Realtime sync with optimistic updates + 15s background interval
- BottomTabBar: liquid glass floating pill with BlurView + animated spring
- 51 mobile tests passing
- Mobile session storage migrated from AsyncStorage to `expo-secure-store`
- metro.config.js wired for pnpm monorepo (iOS + Android working)
- iOS safe-area handling fixed at app shell (`SafeAreaProvider` + `SafeAreaView`) to prevent top notification-bar overlap
- Fixed UI congestion on `GoalFormScreen` by adjusting field layouts and flex ratios for a cleaner aesthetic
- Updated UI on `GoalsScreen` objectives cards: improved Quick Inject layout to flex-wrap with refined pill buttons, thickened progress bars, and restyled Clear/Modify buttons for better visual hierarchy and adherence to design tokens
- Standardized card action buttons (Edit/Modify and Delete/Clear/Remove) across `BudgetsScreen`, `CategoryManagerScreen`, and `TransactionsScreen` to match the refined styles from `GoalsScreen`
- Replaced the 'Settings' icon in the `BottomTabBar` with a 'User' icon, and implemented dynamic rendering of the user's profile picture if one is uploaded
- Increased bottom-tab avatar size and made inactive-state avatar fully visible for stronger identity affordance
- Cleaned up the `ProfileScreen` by removing the manual "Profile Picture URL" text input field as users should rely entirely on device-native file/gallery picker uploads
- Added a dynamic, rotating greeting message with the user's name to the top of the `DashboardScreen` that cycles every 30 seconds
- Updated the `ProfileScreen` Regional Preferences section to use a new custom `SelectField` component for Timezone, Locale, and Currency inputs, now populated with an exhaustive, dynamically-generated list of all standard Intl options
- Added a smart cascading dropdown for Country -> City that automatically pre-fills the corresponding Timezone, Locale, and Currency based on the selected country
- Extended the sliding pill animation style from the BottomTabBar to the `SegmentedControl` component for consistent micro-interactions throughout the app
- Expanded regional coverage with full country/city datasets using `country-state-city`
- Added global centralized toast feedback system:
  - `ToastViewport` mounted at app shell level
  - `publishToast` bus used for action success/error flows
  - Queue + auto-dismiss behavior
  - Bottom-safe placement with subtle fade/slide animation
- Settings preferences moved below Category Studio and now persist immediately on toggle (no save button)
- Refactored session termination UI in `SettingsScreen` to a more user-friendly "SIGN OUT" flow with a native confirmation dialog, replacing technical "SEVER CONNECTION" terminology
- Major mutation feedback shifted from nearby inline banners to centralized toast UX

### Infrastructure
- pnpm monorepo workspaces
- docker-compose for local Postgres + Redis
- Render blueprints: staging.yaml + production.yaml
- Hosted staging is now live on Render at `https://glitch-api-staging.onrender.com`
  - service: `glitch-api-staging`
  - Postgres: `glitch-postgres-staging`
  - Key Value: `glitch-redis-staging`
  - `/health`, `/api/v1/status`, and `/api/v1/bootstrap` verified healthy
  - `/api/v1/metrics` intentionally disabled in staging
- `pnpm dev` / `pnpm dev:tailscale` are the default phone workflow: they auto-start DB, detect the machine's Tailscale IPv4, start the API, and launch Expo Go with Tailscale-aware host configuration
- `pnpm dev:staging` now launches Expo Go against the hosted staging backend without starting local API infrastructure
- Dependency audit is clean: direct Fastify vulnerability patched and transitive pnpm overrides applied for `brace-expansion` and `yaml`
- Expo account connected, project linked to GitHub (EAS available)
  - `eas build` available for dev builds, preview, and production
  - `eas submit` available for App Store / Play Store submission
  - GitHub → Expo connection means EAS can trigger builds on push

### Docs
- All docs renamed to kebab-case in docs/
- docs/README.md is clean grouped index
- Root README.md is concise with links to full docs
- Added explicit staging and production readiness checklists with env validation and rollout gates
- Added `docs/environment-workflows.md` to explain how local dev, staging, production, and maintenance flows are separated in practice
- Staging docs and mobile preview config now target the live Render staging hostname until custom DNS is live

## What's In Progress
- No platform-blocking issue on local dev.
- Hosted staging exists and works; remaining ops maturity work is custom DNS, staging smoke/perf, and finalizing production-domain rollout.

## Recent Fixes
- Removed the failed Cloudflare / Expo tunnel experiment and replaced it with a Tailscale-based Expo Go workflow
- Expo mobile package compatibility aligned to SDK 55 expectations (`expo`, `expo-dev-client`, `expo-image-picker`)
- Cleared moderate dependency advisories by patching Fastify and pinning safe transitive versions through pnpm overrides
- ECONNREFUSED on stack restart (IPv6 + AggregateError retry logic)
- CI NODE_ENV=test missing (rate limiter was active during tests)
- Rate limiter off-by-one (maxRequests=0) and window boundary (<=)
- Audit event name mismatch in docs
- Dockerfile stale node_modules COPY
- First hosted Render deploy failed on empty DB because startup seeded categories before schema existed; fixed with runtime migrations before app bootstrap
- ensureDefaultCategories TOCTOU race condition
- DELETE-with-empty-JSON parser errors now return explicit 400 envelopes (no accidental 500)
- Mutation retry safety improved via idempotency key replay behavior
- Top notification/status-bar toast overlap fixed by moving toast host to bottom-safe position
