updated_by: Codex
updated_at: 2026-04-21
---

# Handoff Log

This file is updated at the END of every work session. It captures exactly what was done, any open threads, and what the next agent/session should know immediately.

## How to Use

- **Starting a session:** Read this file first. It tells you where we left off.
- **Ending a session:** Update the "Last Session" block below before closing.

---

## Last Session — 2026-04-21

**Done:**
- Added first-pass Sentry runtime monitoring for both backend and mobile.
- Backend:
  - installed `@sentry/node`
  - added `apps/api/src/monitoring/sentry.ts`
  - startup, uncaught, unhandled-rejection, handled 5xx `AppError`, and unhandled request failures now report to Sentry when `SENTRY_DSN` is configured
  - expected 4xx validation/auth/parser noise is filtered out before capture
- Mobile:
  - installed `@sentry/react-native`
  - added `apps/mobile/src/monitoring/sentry.ts`
  - Sentry initializes from `index.ts` when `EXPO_PUBLIC_SENTRY_DSN` is set
  - authenticated user/profile context is synced into Sentry from `App.tsx`
- Config/docs:
  - added Sentry env vars to `.env.example`, `README.md`, and `docs/ops-runbook.md`
  - added Sentry placeholders to Render staging/production manifests
  - EAS preview/production and staging dev scripts now set explicit Sentry environment tags
- Verification completed locally:
  - `pnpm --filter @glitch/api typecheck`
  - `pnpm --filter @glitch/mobile typecheck`
  - `pnpm --filter @glitch/api test` -> 195 passing
  - `pnpm --filter @glitch/mobile test` -> 58 passing

**Open threads:**
- Changes are local only right now; no commit yet for the Sentry integration pass.
- Sentry is runtime-only in this pass. Source map upload/build-plugin auth is intentionally deferred until Sentry org/project/auth-token details are ready.

**Next session should:**
- Commit and push the Sentry integration if approved.
- Add real DSNs in staging/local envs and do a quick verification event from API and mobile.
- If build-time symbolication is desired next, add the Sentry Expo plugin/source-map workflow with org/project/auth-token config.

---

## Memory Update Protocol

At the end of each session, the active agent updates:

| File | When to update |
|---|---|
| `state.md` | Any feature completed, any bug fixed, any significant change |
| `decisions.md` | Any architectural or design decision made |
| `conventions.md` | Any new pattern established or existing one changed |
| `handoff.md` | Every session end — always update "Last Session" |

Format for the updated_at header: `YYYY-MM-DD`
Format for updated_by: the agent name (Claude / Codex / Gemini)
