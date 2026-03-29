updated_by: Codex
updated_at: 2026-03-29
---

# Project Conventions

All agents must follow these. Do not deviate without updating this file.

## API Conventions

### File Structure
```
apps/api/src/modules/<name>/
  routes.ts       — Fastify route registration + handlers
  service.ts      — Business logic (if complex)
  validation.ts   — Zod schemas
  validation.test.ts
```

### Route Patterns
- Routes are declared directly on the Fastify app instance (`app.get/post/patch/delete`) using full `/api/v1/...` paths.
- Auth is resolved in global `onRequest` hook; handlers use `requireAuth(request)` for protected routes.
- Response shape: `{ item: T }` for single, `{ items: T[] }` for list, pagination is `{ items, pagination: { page, pageSize, hasMore, nextPage } }`.
- Error shape: `{ error: { code: string, message: string, details? }, requestId }`.
- Authenticated mutation routes should support `Idempotency-Key` via shared `executeIdempotent(...)` utility.
- Generated public URLs must come from trusted env/config (`PUBLIC_API_BASE_URL`) rather than forwarded request headers unless proxy trust has been explicitly configured.

### Validation
- All inputs validated with Zod schemas defined in `validation.ts`
- Unknown fields on strict security-sensitive payloads should be rejected rather than ignored.
- Currency amounts stored as integers (cents) or decimals — check existing schema before adding
- Dates as ISO strings (`occurredAt`, `targetDate`)

### Database
- ORM: Drizzle — always use typed queries, never raw SQL except in `db.execute(sql\`...\`)`
- Migrations in `apps/api/drizzle/`
- Run `pnpm --filter @glitch/api db:generate` after schema changes
- Never modify existing migration files
- Hosted environments must be able to bootstrap a brand-new database: keep runtime migration support intact when changing API startup or Docker packaging
- Hosted environments must use a writable avatar storage path. Prefer the default temp-directory behavior unless a persistent volume is explicitly mounted and exposed via `AVATAR_STORAGE_DIR`.
- Avatar persistence should not rely on container-local filesystem state for correctness. Prefer durable DB/object storage and return app-relative avatar paths that the mobile client can resolve against the current API origin.

### Testing
- Integration tests use `createApp()` helper — see existing test files for pattern
- DB tests hit real Postgres — no mocking the DB
- Test file naming: `*.test.ts` (unit) or `*.integration.test.ts` (integration)
- NODE_ENV=test in all test runs (rate limiter bypassed in test mode)

## Mobile Conventions

### File Structure
```
apps/mobile/src/
  screens/        — Pure presentational components, receive callbacks as props
  components/ui/  — Reusable UI primitives
  api/client.ts   — All API calls
  theme/          — Design tokens (tokens.ts)
  navigation/     — Route definitions (routes.ts)
  utils/          — Pure utility functions
  flow/           — App state logic
```

### Design System ("Glitch Midnight")
- Background: `#000000` (true black)
- Accent: `#D4FF00` (chartreuse)
- Danger: `#FF3366` (pink)
- Text primary: `#FFFFFF`
- Text secondary: `rgba(255,255,255,0.5)`
- Use `theme.*` tokens — never hardcode hex values except in theme file
- Use `createStyles()` helper — never `StyleSheet.create()` directly

### State
- All state lives in `App.tsx` — screens are pure/presentational
- No Redux, no Context, no Zustand
- Optimistic updates: update local state immediately, reconcile 700ms later
- Never add loading spinners for operations that take <300ms
- Store auth/session secrets in `expo-secure-store`, not AsyncStorage.

### Feedback UX (Toast Standard)
- Use centralized toast feedback for mutation success/error via `publishToast(...)`.
- Do not add new per-screen inline success/error banners for mutation outcomes unless the message must remain persistently visible.
- Keep `Alert.alert` only for user confirmation dialogs (especially destructive actions like delete/account removal).
- Toast host is global (`ToastViewport`) and should remain mounted at app shell level.
- Toast placement should stay bottom-safe (avoid status bar and avoid bottom-tab overlap).

### API Client
- All calls go through `apps/mobile/src/api/client.ts`
- Error handling: catch in App.tsx/screen handlers and surface user-facing failures via centralized toast where applicable

### Local Device Workflow
- For real-phone testing on any network, use `pnpm dev` / `pnpm dev:tailscale`.
- The default phone workflow should use the machine's Tailscale IPv4 for:
  - `EXPO_PUBLIC_API_URL=http://<tailscale-ip>:4000`
  - `REACT_NATIVE_PACKAGER_HOSTNAME=<tailscale-ip>`
- Expo Go-oriented scripts should set `EXPO_NO_REDIRECT_PAGE=1` to avoid browser/interstitial QR codes when `expo-dev-client` is installed.
- Google Sign-In must remain disabled until the mobile client can supply a nonce that the backend verifies against the ID token.
- For hosted staging testing, prefer the live Render hostname until custom DNS is proven live; keep mobile preview/dev-staging configs aligned with the actual reachable backend host.
- Keep Tailscale optional in command naming:
  - `pnpm dev` / `pnpm dev:local` should work without Tailscale
  - `pnpm dev:tailscale` should be the explicit cross-network local-backend path
  - `pnpm dev:staging` should work without Tailscale
  - `pnpm dev:staging:tailscale` should be the explicit cross-network hosted-staging path

## Git Conventions

- Commit format: `type(scope): message` — e.g. `fix(api): ...`, `feat(mobile): ...`
- Types: feat, fix, docs, style, refactor, test, chore
- No `--no-verify`, no `--force` to main
- Only Claude commits — external agents propose, Claude writes and commits

## Dependency Maintenance

- Prefer the smallest safe dependency update that resolves the issue:
  - direct dependency patch/minor bump first
  - root `pnpm.overrides` for vulnerable transitives when upstream trees are otherwise stable
- After dependency changes, rerun:
  - `pnpm audit --prod`
  - `pnpm audit`
  - `pnpm --filter @glitch/api typecheck`
  - `pnpm --filter @glitch/mobile typecheck`
  - `pnpm --filter @glitch/api test`
  - `pnpm --filter @glitch/mobile test`

## Naming
- API files: camelCase `.ts`
- Docs: lowercase kebab-case `.md`
- DB tables: snake_case
- DB columns: snake_case
- TypeScript types/interfaces: PascalCase
- React components: PascalCase
- Utility functions: camelCase
