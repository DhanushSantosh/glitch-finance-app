# Regional Currency + Timezone Support

## Objective

Provide consistent, profile-driven regional behavior across API and mobile:

- Currency defaults and formatting
- Timezone-aware month windows and date rendering
- Locale-aware number/date display

## Detailed Implementation Plan

1. **Define regional source of truth**
   - Primary source: authenticated user profile (`timezone`, `locale`, `currency`)
   - Fallback source: bootstrap defaults (`currency`, `locale`, `timezone`)
   - Final fallback: safe constants (`UTC`, `en-IN`, `INR`)

2. **Backend normalization + validation**
   - Add reusable regional utility functions:
     - timezone/locale/currency support checks
     - normalized fallback resolution
     - timezone-aware current month token
     - timezone-aware month UTC window boundaries
   - Enforce profile update validation for timezone, locale, and currency.

3. **Backend functional wiring**
   - Reports:
     - default `month` by user timezone
     - default `currency` by user profile currency
     - aggregate daily buckets in user timezone
   - Budgets:
     - default list month by user timezone
     - use timezone month window for spend aggregation
     - default create currency from profile when omitted
   - Transactions / Goals:
     - default create currency from profile when omitted
   - Bootstrap:
     - include `locale` + `timezone` global fallback hints.

4. **Mobile formatting and defaults**
   - Add shared regional resolver for `locale/timezone/currency`.
   - Replace hardcoded monetary/date formatting with locale-aware `Intl` formatters.
   - Pass regional preferences into dashboard, transactions, budgets, and goals screens.
   - Use regional default currency in create/edit forms (transaction, budget, goal).
   - Initialize authenticated month context from profile timezone.

5. **Testing**
   - API unit tests for timezone month token/window + currency normalization.
   - API integration coverage for profile-driven defaults and timezone window behavior.
   - Mobile unit tests for formatting and regional preference resolution.

## Implemented in this pass

- `apps/api/src/utils/regional.ts` introduced and reused across modules.
- Profile patch now validates invalid timezone/locale/currency instead of silently accepting bad values.
- Reports and budgets now use timezone-aware month boundaries from profile settings.
- Transaction, budget, and goal create flows now default currency from profile when omitted.
- Bootstrap now includes `locale` and `timezone`.
- Mobile now resolves regional preferences and uses locale-aware money/date rendering across key screens.
- Form defaults now use regional currency instead of a hardcoded `INR`.
- New tests added for regional utility logic and integration paths.

## Non-goals (still out of scope)

- Historical exchange-rate conversion between mixed currencies
- Region-specific fiscal year/tax calendar logic
- Full i18n translation/localized copy strings
