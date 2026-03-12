# UI Screen Blueprints

## Purpose
This file defines per-screen structure and component contracts for the mobile app revamp.
Each blueprint must be followed to keep UX behavior and visual rhythm consistent.

## Global Shell Contract
- App shell uses auth gate plus signed-in tab shell.
- Signed-in shell uses bottom tabs: `Dashboard`, `Transactions`, `Budgets`, `Goals`, `Settings`.
- Create/edit flows open as modal-stack routes under parent tabs.
- All screens use `Screen` primitive and semantic theme tokens.

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
3. Month filter `Card` with `TextField` and secondary load `Button`
4. KPI row using `StatTile`
5. Category insights `Card` with `ListItem` rows
6. Trend `Card` with `ListItem` rows
7. `EmptyState` shown when data is absent

Behavior contract:
- Month filter triggers summary reload only.
- Summary cards remain readable for zero-data states.

## Transactions
Structure:
1. `Screen` with pull-to-refresh
2. `AppHeader` + add action
3. Empty fallback via `EmptyState`
4. Repeating `ListItem` transaction rows
5. Row actions: `Edit` and `Delete` buttons

Behavior contract:
- Add opens transaction create route.
- Edit opens transaction edit route with prefilled values.
- Delete confirms before mutation.

## Transaction Create/Edit
Structure:
1. `Screen` (keyboard-aware)
2. `Card`
3. `AppHeader`
4. Direction `SegmentedControl`
5. Amount/currency/category/counterparty/note/time `TextField` + `SegmentedControl`
6. Error `InlineMessage` when validation fails
7. Footer action row with cancel + primary save

Behavior contract:
- Validation blocks invalid amount/date input.
- Save performs create or edit based on modal route mode.

## Budgets
Structure:
1. `Screen` with pull-to-refresh
2. `AppHeader` + add action
3. Month filter `Card`
4. Budget summary `StatTile` row
5. `EmptyState` when no budget rows
6. Budget rows via `ListItem` with edit/delete actions

Behavior contract:
- Month reload updates totals and list for selected month.
- Add/edit flows use budget modal routes.

## Budget Create/Edit
Structure:
1. `Screen` (keyboard-aware)
2. `Card`
3. `AppHeader`
4. Category `SegmentedControl`
5. Month/amount/currency `TextField`
6. Error `InlineMessage` on validation failure
7. Footer action row with cancel + primary save

Behavior contract:
- Category is required.
- Month must be `YYYY-MM`.
- Save route returns to budgets list with refreshed data.

## Goals
Structure:
1. `Screen` with pull-to-refresh
2. `AppHeader` + add action
3. `EmptyState` when no goals
4. Goal rows via `ListItem` with progress and actions

Behavior contract:
- Progress and monetary values stay visible at glance.
- Edit/delete actions behave consistently with transactions and budgets.

## Goal Create/Edit
Structure:
1. `Screen` (keyboard-aware)
2. `Card`
3. `AppHeader`
4. Goal name/target/current/currency/date `TextField`
5. Error `InlineMessage` when invalid
6. Footer action row with cancel + primary save

Behavior contract:
- Target must be positive.
- Current cannot be negative.
- Optional target date must parse to valid date.

## Settings
Structure:
1. `Screen`
2. Top `AppHeader`
3. SMS disclosure `Card`:
   - Section header
   - Warning and info `InlineMessage`
   - Action row (`Keep Disabled`, `Request Enable`)
4. Account `Card`:
   - Sign out action

Behavior contract:
- SMS feature remains disabled in this phase.
- Consent action logs user intent only.
- Sign out clears local session and protected data.

## Cross-Screen State Contract
Every primary screen must support:
- Loading state (refresh spinner or button loading state)
- Empty state (`EmptyState`)
- Validation/error state (`InlineMessage` or field errors)
- Readable spacing and target sizes consistent with theme scale
