updated_by: Gemini
updated_at: 2026-03-16
---

# Project State

## What's Done

### API (apps/api)
- Fastify v5 REST API fully implemented and tested
- Modules: auth (OTP + session), categories, transactions, budgets, goals, reports (summary + export), imports (SMS), consents, audit, alerts, SLO monitor, metrics
- 136 tests passing (unit + integration)
- Idempotent mutation protection implemented for authenticated write routes (transactions, budgets, goals, categories, consent intent)
- New persistence table for idempotency records: `idempotency_keys`
- Error normalization improved: Fastify JSON parser + Postgres constraint errors now map to stable 4xx envelopes where applicable
- Auth hardening: active session cap (AUTH_MAX_ACTIVE_SESSIONS=5), recovery OTP path, rate limiting
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
- 35 mobile tests passing
- metro.config.js wired for pnpm monorepo (iOS + Android working)
- iOS safe-area handling fixed at app shell (`SafeAreaProvider` + `SafeAreaView`) to prevent top notification-bar overlap
- Fixed UI congestion on `GoalFormScreen` by adjusting field layouts and flex ratios for a cleaner aesthetic
- Updated UI on `GoalsScreen` objectives cards: improved Quick Inject layout to flex-wrap with refined pill buttons, thickened progress bars, and restyled Clear/Modify buttons for better visual hierarchy and adherence to design tokens
- Standardized card action buttons (Edit/Modify and Delete/Clear/Remove) across `BudgetsScreen`, `CategoryManagerScreen`, and `TransactionsScreen` to match the refined styles from `GoalsScreen`
- Replaced the 'Settings' icon in the `BottomTabBar` with a 'User' icon, and implemented dynamic rendering of the user's profile picture if one is uploaded
- Cleaned up the `ProfileScreen` by removing the manual "Profile Picture URL" text input field as users should rely entirely on device-native file/gallery picker uploads
- Added a dynamic, rotating greeting message with the user's name to the top of the `DashboardScreen` that cycles every 30 seconds
- Updated the `ProfileScreen` Regional Preferences section to use a new custom `SelectField` component for Timezone, Locale, and Currency inputs, now populated with an exhaustive, dynamically-generated list of all standard Intl options

### Infrastructure
- pnpm monorepo workspaces
- docker-compose for local Postgres + Redis
- Render blueprints: staging.yaml + production.yaml
- `pnpm dev` auto-starts + waits for DB before API
- Expo account connected, project linked to GitHub (EAS available)
  - `eas build` available for dev builds, preview, and production
  - `eas submit` available for App Store / Play Store submission
  - GitHub → Expo connection means EAS can trigger builds on push

### Docs
- All docs renamed to kebab-case in docs/
- docs/README.md is clean grouped index
- Root README.md is concise with links to full docs

## What's In Progress
- Memory sync complete; awaiting next feature thread.

## Recent Fixes
- ECONNREFUSED on stack restart (IPv6 + AggregateError retry logic)
- CI NODE_ENV=test missing (rate limiter was active during tests)
- Rate limiter off-by-one (maxRequests=0) and window boundary (<=)
- Audit event name mismatch in docs
- Dockerfile stale node_modules COPY
- ensureDefaultCategories TOCTOU race condition
- DELETE-with-empty-JSON parser errors now return explicit 400 envelopes (no accidental 500)
- Mutation retry safety improved via idempotency key replay behavior
