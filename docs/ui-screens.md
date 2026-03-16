# UI Screen Blueprints

## Purpose

This file defines per-screen structure and component contracts for the mobile app.
Each blueprint must be followed to keep UX behavior and visual rhythm consistent.

## Global Shell Contract

- App shell uses auth gate plus signed-in tab shell.
- Signed-in shell uses bottom tabs: `Dashboard`, `Transactions`, `Budgets`, `Goals`, `Settings`.
- Create/edit flows open as **modal-stack routes** — `modalRoute` state controls them, and the bottom tab bar is hidden while any modal is active.
- All screens use the `Screen` primitive and semantic `theme.*` tokens.
- No raw hex values in screen files (enforced by `styleGuard.test.ts`).

## Auth: Login

Structure:
1. `Screen` (keyboard-aware)
2. `Card`
3. `AppHeader`
4. Email `TextField`
5. Optional `InlineMessage` for error
6. Primary `Button` (request OTP)

Behavior contract:
- CTA disabled until email has content.
- API errors are surfaced inline, not silently swallowed.

## Auth: OTP Verify

Structure:
1. `Screen` (keyboard-aware)
2. `Card`
3. `AppHeader`
4. Info `InlineMessage` (dev-mode guidance)
5. OTP `TextField`
6. Error `InlineMessage` (when needed)
7. Primary verify `Button`
8. Secondary back action `Button`

Behavior contract:
- Verify action enabled only with a 6-digit entry.
- Back action returns to login without crashing state.

## Dashboard

Structure:
1. `Screen` with pull-to-refresh
2. `AppHeader` + right-side quick navigation button
3. Hero net flow value with status badge
4. `StatTile` row (income / expense)
5. SVG line chart card (last 7 days daily net, bezier curve with gradient fill)
6. Month filter `Card` with `TextField` and sync `Button`
7. Spending matrix `Card` with `ListItem` rows (top debit categories)
8. `EmptyState` shown when data is absent

Behavior contract:
- Month filter triggers summary reload only.
- Summary cards remain readable for zero-data states.
- Chart renders only when `dailySeries.length >= 2`.

## Transactions

Structure:
1. `Screen` with pull-to-refresh
2. `AppHeader` + add action
3. Filter `Card` with direction `SegmentedControl`, sort metric `SegmentedControl`, date range `TextField` pair, reset + apply action row
4. Match count label
5. `EmptyState` when no results
6. Repeating `ListItem` rows (card style) with direction icon, amount, edit/remove action row
7. Load more `Button` when `pagination.hasMore`

Behavior contract:
- Filters are applied only on explicit action (not auto-applied on change).
- Add opens `transactionForm` modal route in create mode.
- Edit opens `transactionForm` modal route in edit mode with prefilled values.
- Delete shows confirmation alert before mutation.

## Transaction Create/Edit

Structure:
1. `Screen` (keyboard-aware)
2. `AppHeader`
3. Direction `SegmentedControl`
4. Amount / currency / category / counterparty / note / date `TextField` and selectors
5. Error `InlineMessage` on validation failure
6. Footer action row: cancel + primary save

Behavior contract:
- Validation blocks invalid amount or date.
- Save performs create or update based on `modalRoute.mode`.
- On save, navigates back to Transactions and refreshes list.

## Budgets

Structure:
1. `Screen` with pull-to-refresh
2. `AppHeader` + add action
3. Month navigator row (prev, input, next) with apply button
4. Budget total summary row with `StatTile` (budgeted / spent / remaining)
5. `EmptyState` when no budget rows
6. Budget rows via `ListItem` with edit/delete actions and utilization display

Behavior contract:
- Month navigation shifts by one month with immediate reload.
- Add/edit flows use `budgetForm` modal routes.

## Budget Create/Edit

Structure:
1. `Screen` (keyboard-aware)
2. `AppHeader`
3. Category `SegmentedControl`
4. Month / amount / currency `TextField`
5. Error `InlineMessage` on validation failure
6. Footer: cancel + primary save

Behavior contract:
- Category is required.
- Month must be `YYYY-MM`.
- On save, returns to Budgets with refreshed data for the saved month.

## Goals

Structure:
1. `Screen` with pull-to-refresh
2. `AppHeader` + add action
3. `EmptyState` when no goals
4. Goal `ListItem` rows with progress bar, contribute action, edit/delete

Behavior contract:
- Progress and monetary values are visible at a glance.
- Contribute action increments current amount with a confirmation flow.
- Edit/delete behavior is consistent with transactions and budgets.

## Goal Create/Edit

Structure:
1. `Screen` (keyboard-aware)
2. `AppHeader`
3. Name / target amount / current amount / currency / target date `TextField`
4. Error `InlineMessage` when invalid
5. Footer: cancel + primary save

Behavior contract:
- Target must be positive.
- Current cannot be negative.
- Optional target date must parse to a valid date.

## Settings

Structure:
1. `Screen`
2. `AppHeader`
3. Profile `Card`:
   - Profile summary (name + email)
   - `Edit Profile` action -> opens `profile` modal
4. Manage Categories action row -> opens `categoryManager` modal
5. SMS disclosure `Card`:
   - Section header
   - Warning and info `InlineMessage`
   - Action row: Keep Disabled / Request Enable
6. Account `Card`:
   - Delete account action (destructive)
   - Sign out action

Behavior contract:
- SMS feature remains disabled; consent action logs user intent only.
- Profile action opens full profile editing flow with per-profile settings.
- Delete account shows confirmation alert, calls account deletion API, clears local state.
- Sign out clears local session and resets all authenticated state.

## Profile (`profile` modal)

Structure:
1. `Screen` (keyboard-aware)
2. `AppHeader`
3. Identity `Card`:
   - Avatar preview/fallback initials
   - Name/email summary
   - Avatar URL field
4. Personal details `Card`:
   - First name, last name, display name
   - Phone number, date of birth, occupation
5. Regional preferences `Card`:
   - City, country, timezone, locale, currency
   - Bio
6. Per-profile settings `Card`:
   - Push notifications toggle
   - Email notifications toggle
   - Weekly summary toggle
   - Biometric lock toggle intent
   - Product updates toggle
7. Footer actions: `Back`, `Save Profile`

Behavior contract:
- Save performs partial profile update via `/api/v1/profile`.
- Date of birth uses `YYYY-MM-DD`.
- Currency uses a 3-letter uppercase code.
- Invalid avatar URL is blocked with inline error.

## Category Studio (`categoryManager` modal)

Structure:
1. `Screen` with pull-to-refresh
2. `AppHeader` + back action + add action
3. `EmptyState` if no custom categories
4. Category `ListItem` rows with direction badge, edit/delete actions
5. Default categories shown as read-only (edit/delete blocked)

Behavior contract:
- Default categories (`isDefault: true`) are immutable — edit and delete are not exposed.
- Add opens `categoryForm` modal in create mode.
- Edit opens `categoryForm` modal in edit mode.
- Delete shows confirmation alert before mutation.

## Category Create/Edit (`categoryForm` modal)

Structure:
1. `Screen` (keyboard-aware)
2. `AppHeader`
3. Name `TextField`
4. Direction `SegmentedControl` (debit / credit / transfer)
5. Error `InlineMessage` on validation failure
6. Footer: cancel + primary save

Behavior contract:
- Both name and direction are required.
- On save, fetches updated category list and returns to `categoryManager`.

## Cross-Screen State Contract

Every primary screen must support:
- Loading state (refresh spinner or button loading state)
- Empty state (`EmptyState` component)
- Validation/error state (`InlineMessage` or field-level error)
- Readable spacing and touch target sizes consistent with the theme scale
