updated_by: Codex
updated_at: 2026-03-28
---

# Handoff Log

This file is updated at the END of every work session. It captures exactly what was done, any open threads, and what the next agent/session should know immediately.

## How to Use

- **Starting a session:** Read this file first. It tells you where we left off.
- **Ending a session:** Update the "Last Session" block below before closing.

---

## Last Session — 2026-03-28

**Done:**
- Removed the Cloudflare / Expo tunnel experiment entirely and reset the repo back to `origin/main`.
- Replaced the default phone workflow with a Tailscale-based Expo Go path:
  - added `scripts/dev-tailscale.sh`
  - `pnpm dev` and `pnpm dev:tailscale` now use Tailscale
  - `pnpm dev:phone` now points to the same Tailscale workflow
- Updated mobile Expo scripts to be Expo Go-first and disable the redirect page.
- Removed tunnel-only dependencies:
  - root `qrcode-terminal`
  - mobile `@expo/ngrok`
- Restored Expo package compatibility updates:
  - `expo` -> `~55.0.9`
  - `expo-dev-client` -> `~55.0.19`
  - `expo-image-picker` -> `~55.0.14`

**Open threads:**
- Need to run install/typecheck and a real `pnpm dev` smoke test on the new Tailscale workflow.

**Next session should:**
- Validate `pnpm dev` end to end with Expo Go over Tailscale.
- Continue app work once the cross-network phone workflow is confirmed stable.

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
