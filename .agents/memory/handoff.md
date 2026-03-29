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
- Investigated the profile-picture inconsistency that showed up in both local dev and hosted staging after restarts.
- Implemented a durable avatar persistence fix locally:
  - added new `avatar_assets` table to persist avatar content in Postgres instead of container/local filesystem storage
  - generated Drizzle migration `0005_lovely_thunderbolts.sql`
  - updated profile avatar routes to read/write avatar blobs from the DB and store app-relative avatar paths in `user_profiles.avatar_url`
- Implemented a mobile-side avatar URL normalization fix locally:
  - `apps/mobile/src/api/client.ts` now rewrites relative or stale absolute avatar URLs to the current `API_BASE_URL`
  - this protects local dev when the API host changes between localhost, LAN, Tailscale, or staging sessions
- Fixed an env parsing sharp edge locally:
  - optional blank env vars in `.env` / `.env.example` now normalize to `undefined` instead of failing validation (`PUBLIC_API_BASE_URL`, `AVATAR_STORAGE_DIR`, `ALERTS_WEBHOOK_URL`, `RESEND_API_KEY`)
- Added/updated tests:
  - API profile integration test now verifies avatar persistence across app restarts
  - mobile API client tests now verify avatar URL normalization
- Verification completed locally:
  - `pnpm --filter @glitch/api typecheck`
  - `pnpm --filter @glitch/mobile typecheck`
  - `pnpm --filter @glitch/api test` -> 185 passing
  - `pnpm --filter @glitch/mobile test` -> 53 passing

**Open threads:**
- The avatar persistence + URL normalization fix is currently local only and not committed/pushed yet.
- `.env.example` is still modified in the working tree from the env cleanup / formatting pass and remains uncommitted.
- Hosted staging is still using the last pushed code, so the new DB-backed avatar persistence is not deployed yet.

**Next session should:**
- Review the local avatar fix working tree, then commit/push it if approved.
- After push, redeploy `glitch-api-staging` so staging avatars persist across service restarts/hibernation.
- Custom staging DNS is still deferred; keep using `https://glitch-api-staging.onrender.com` until domain work starts.

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
