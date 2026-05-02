updated_by: Codex
updated_at: 2026-05-03
---

# Handoff Log

This file is updated at the END of every work session. It captures exactly what was done, any open threads, and what the next agent/session should know immediately.

## How to Use

- **Starting a session:** Read this file first. It tells you where we left off.
- **Ending a session:** Update the "Last Session" block below before closing.

---

## Last Session — 2026-05-03

**Done:**
- Added cross-platform Apple Sign-In support by keeping the native iOS path and adding a backend-mediated browser fallback for Android / non-native contexts.
- Added backend Apple callback handling for browser sign-in and support for validating Apple tokens against either the app bundle ID or a Service ID audience.
- Added `APPLE_SERVICE_ID` / `EXPO_PUBLIC_APPLE_SERVICE_ID` env surfaces and Expo mobile scheme support for the browser callback round-trip.
- Relaxed Google Sign-In button visibility so it can appear on both platforms when explicitly enabled, while still failing clearly in Expo Go where the native module is unavailable.
- Updated API and mobile tests to cover the new Apple callback flow and Apple audience payload handling.

**Open threads:**
- Provider-side Apple browser auth still needs real service configuration to work end to end on Android:
  - `APPLE_SERVICE_ID` in API env
  - `EXPO_PUBLIC_APPLE_SERVICE_ID` in mobile env
  - the Apple developer portal Service ID / return URL must point to `/api/v1/auth/oauth/apple/callback`
- Google Sign-In is still native-build-only and cannot succeed inside Expo Go.

**Next session should:**
- Verify Apple browser sign-in end to end against a real configured Service ID.
- Run a device-level auth sanity pass: Apple on Android/browser fallback, Apple on iPhone native flow, and Google in a dev build on both platforms when enabled.

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
