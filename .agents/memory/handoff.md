updated_by: Gemini
updated_at: 2026-03-16
---

# Handoff Log

This file is updated at the END of every work session. It captures exactly what was done, any open threads, and what the next agent/session should know immediately.

## How to Use

- **Starting a session:** Read this file first. It tells you where we left off.
- **Ending a session:** Update the "Last Session" block below before closing.

---

## Last Session — 2026-03-16

**Done:**
- Created a custom `SelectField` component for the mobile UI and updated `ProfileScreen` to use it for Timezone, Locale, and Currency inputs. Generated an exhaustive list of Intl-supported timezones and currencies via a Node script to populate these dropdowns.
- Added a dynamic, rotating greeting message with the user's name to the `DashboardScreen` that updates periodically.
- Removed the manual Profile Picture URL text input field from `ProfileScreen` to encourage standard file/gallery uploads.
- Replaced the 'Settings' icon in the `BottomTabBar` with a 'User' icon, and implemented dynamic rendering of the user's custom profile picture if available.
- Standardized card action buttons (Edit/Modify and Delete/Clear/Remove) across `BudgetsScreen`, `CategoryManagerScreen`, and `TransactionsScreen` to match the refined styles from `GoalsScreen`.
- Updated UI on `GoalsScreen` objectives cards: removed hardcoded colors, enhanced progress bar visibility, refined tap targets/borders for secondary actions, and fixed cramped Quick Inject layout with flex-wrap pill buttons.
- Fixed UI congestion on `GoalFormScreen` (removed split view on balance/deadline, adjusted flex ratios on capital target row).
- Added API idempotency layer for authenticated mutations (`Idempotency-Key`) with replay support and conflict protection.
- Added DB migration/table for idempotency storage (`idempotency_keys`).
- Hardened API error mapping for Fastify parser errors and common Postgres constraint errors so expected client failures stay 4xx.
- Added resilience integration test suite (idempotency replay/conflict + parser/constraint mapping checks).
- Fixed mobile iOS safe-area overlap using `react-native-safe-area-context` at app shell.
- Verified baseline remains green: 136 API tests + 35 mobile tests + workspace typecheck.
- Updated memory docs to reflect current code and conventions.

**Open threads:**
- None.

**Next session should:**
- If continuing backend hardening, extend idempotency support to additional write routes if any new ones are added.
- Continue Sprint work from updated `state.md`.

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
