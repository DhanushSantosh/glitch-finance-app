updated_by: Codex
updated_at: 2026-03-29
---

# Handoff Log

This file is updated at the END of every work session. It captures exactly what was done, any open threads, and what the next agent/session should know immediately.

## How to Use

- **Starting a session:** Read this file first. It tells you where we left off.
- **Ending a session:** Update the "Last Session" block below before closing.

---

## Last Session — 2026-03-29

**Done:**
- Executed the first real hosted staging rollout on Render:
  - created `glitch-api-staging` web service from `apps/api/Dockerfile`
  - created managed Postgres `glitch-postgres-staging`
  - created managed Key Value instance `glitch-redis-staging`
  - configured staging env vars and `/health` health check
- Fixed first-hosted-deploy startup failure by adding runtime DB migrations before startup and copying migration SQL into the API Docker image.
- Verified the live staging backend at `https://glitch-api-staging.onrender.com`:
  - `/health` -> `200`
  - `/api/v1/status` -> `200`
  - `/api/v1/bootstrap` -> `200`
  - `/api/v1/metrics` -> `404` with metrics intentionally disabled
- Verified OTP delivery on staging via Resend after env correction:
  - first failure was invalid `OTP_EMAIL_FROM` format
  - current staging sender works and OTP mail is received
- Updated local repo staging references away from the non-working custom hostname and toward the live Render hostname:
  - `apps/mobile/package.json` `dev:staging`
  - `apps/mobile/eas.json` preview API URL
  - staging docs/runbook command examples

**Open threads:**
- Custom staging DNS is still not live. Use `https://glitch-api-staging.onrender.com` until the custom domain is actually configured and resolvable.
- The staging-alignment file changes are ready to commit/push.

**Next session should:**
- Continue from a working hosted staging baseline.
- Either finish committing/pushing the staging URL alignment and memory sync, or move on to staging smoke/perf validation and mobile-against-staging testing.

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
