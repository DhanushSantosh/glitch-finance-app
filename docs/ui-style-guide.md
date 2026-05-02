# UI Style Guide — Velqora Midnight

## Purpose

This document is the source of truth for all mobile UI decisions.
It aligns implementation with design principles from Apple HIG, Android design guidance, WCAG 2.2, and NN/g usability heuristics.

## Brand Tone

**Velqora Midnight** is a dark-first, premium finance aesthetic.

- High-contrast black-and-chartreuse palette signals precision and control.
- Minimal visual noise — surfaces are intentionally near-black to let financial data breathe.
- Motion is purposeful: spring animations in navigation, not decorative micro-animations everywhere.
- Financial data is always scannable at a glance.

## Design Principles

- Clarity first: users understand "where they are" and "what to do next" within one glance.
- Progressive disclosure: show core information first, reveal advanced detail only when needed.
- Consistency over novelty: component behavior is predictable across all screens.
- Guardrailed trust: privacy and consent states are explicit, never hidden.
- Accessibility by default: contrast, touch size, and readable text are non-negotiable baseline requirements.

## Token Source of Truth

```
apps/mobile/src/theme/types.ts
apps/mobile/src/theme/tokens.ts
apps/mobile/src/theme/index.ts
```

Import via `createStyles` helper or `theme` singleton — never reference raw hex values inside screen files.

## Color System

### Active Theme: Dark (Velqora Midnight)

| Role | Value | Usage |
|---|---|---|
| `bgBase` | `#000000` | True black app background |
| `bgElevated` | `#0A0A0A` | Slightly elevated sections |
| `surface` | `#121212` | Card/sheet backgrounds |
| `surfaceMuted` | `rgba(255,255,255,0.03)` | Ultra-subtle glass tint |
| `borderSubtle` | `rgba(255,255,255,0.06)` | Barely visible dividers |
| `borderStrong` | `rgba(255,255,255,0.12)` | Prominent borders |
| `textPrimary` | `#FFFFFF` | Body and heading text |
| `textSecondary` | `#A3A3A3` | Supporting labels |
| `textMuted` | `#666666` | Metadata, disabled hints |
| `textInverse` | `#000000` | Text on chartreuse pill backgrounds |
| `actionPrimary` | `#D4FF00` | Chartreuse — CTAs, active state pill |
| `actionPrimaryPressed` | `#B8DF00` | Pressed CTA state |
| `actionSecondary` | `rgba(255,255,255,0.08)` | Secondary button fill |
| `actionSecondaryPressed` | `rgba(255,255,255,0.15)` | Secondary pressed |
| `actionGhost` | `transparent` | Ghost button fill |
| `actionGhostPressed` | `rgba(255,255,255,0.05)` | Ghost pressed |
| `actionDanger` | `#FF3366` | Destructive actions, danger badges |
| `actionDangerPressed` | `#E62E5C` | Danger pressed |
| `statusSuccess` | `#D4FF00` | Positive outcomes (reuses brand) |
| `statusWarn` | `#FFB020` | Warning states |
| `statusError` | `#FF3366` | Errors, debit indicators |
| `statusInfo` | `#3388FF` | Informational states |
| `focusRing` | `rgba(212,255,0,0.4)` | Keyboard focus visible ring |

### Light Theme

Fully defined in `tokens.ts` as `lightTheme`. Not the default active theme in the current release.

### Rule: No Raw Hex in Screen Files

All color references in screen and component files must use `theme.color.*` semantic tokens.
A style guard test (`apps/mobile/src/screens/styleGuard.test.ts`) enforces this for screen files.

## Typography Scale

All sizes are in `sp`/`pt` (React Native logical units).

| Token | Size | Usage |
|---|---|---|
| `display` | 34 | Hero values (net flow, large stat) |
| `title` | 26 | Screen section titles |
| `heading` | 20 | Card section headers |
| `body` | 16 | Standard content text |
| `bodySmall` | 14 | Supporting information |
| `caption` | 12 | Metadata, timestamps, labels |
| `label` | 13 | Form field labels, tags |

Usage rules:
- Financial values use `display` or `heading` weight `800–900` for immediate scanability.
- One `title` per screen section header.
- Captions are only for metadata, never for actions.
- Letter-spacing: large display values use negative tracking (e.g. `-3` for hero figures).

## Spacing Scale

| Token | Value (dp) |
|---|---|
| `none` | 0 |
| `xs` | 4 |
| `sm` | 8 |
| `md` | 12 |
| `lg` | 16 |
| `xl` | 24 |
| `xxl` | 36 |

## Radius Scale

| Token | Value (dp) |
|---|---|
| `sm` | 12 |
| `md` | 18 |
| `lg` | 24 |
| `pill` | 999 |

## Elevation

`elevation.card` is the only defined elevation token.

On dark (Velqora Midnight): `elevation = 0` — rely on dark borders and background contrast; shadows would be invisible against true black.

On light theme: standard box shadow with low opacity.

## Motion and Interaction

Motion tokens:

| Token | Value |
|---|---|
| `durationFast` | 120 ms |
| `durationNormal` | 200 ms |
| `easingStandard` | `ease-in-out` |
| `disabledOpacity` | 0.4 |
| `pressedOpacity` | 0.8 |

Navigation pill animation: spring with `damping: 14`, `stiffness: 300`, `mass: 0.3` for a snappy, non-bouncy feel.

Rules:
- Use `durationFast` for pressed/release transitions.
- Use `durationNormal` for state transitions (loading, toggling).
- Motion is performance-safe — use `react-native-reanimated` worklet-based animations only.
- Never block the JS thread for visual transitions.

## Navigation Pattern

Bottom tab bar is the primary app navigation. It is rendered as a **floating liquid glass pill**:

- `expo-blur` `BlurView` container with dark tint.
- Animated spring pill highlights the active tab with `actionPrimary` chartreuse fill.
- Active icon renders in `#000000` (inverted on chartreuse); inactive icons at 50% white opacity.
- Tab bar floats `32dp` above the screen bottom edge.

Tabs:

| Route | Icon | Screen |
|---|---|---|
| `dashboard` | Home | Dashboard |
| `transactions` | ListOrdered | Transactions |
| `budgets` | PieChart | Budgets |
| `goals` | Target | Goals |
| `settings` | Settings | Settings |

Modal stack routes (overlay, tab bar hidden):

| Kind | Trigger |
|---|---|
| `transactionForm` | Add/Edit transaction |
| `budgetForm` | Add/Edit budget |
| `goalForm` | Add/Edit goal |
| `categoryManager` | Settings → Manage Categories |
| `categoryForm` | Add/Edit category within Category Studio |

## Component Library

Shared primitives live in `apps/mobile/src/components/ui/`:

| Component | Purpose |
|---|---|
| `Screen` | Scroll container with pull-to-refresh |
| `AppHeader` | Title + subtitle + optional right slot |
| `Card` | Elevated glass or standard container |
| `Button` | `primary / secondary / ghost / danger` variants |
| `TextField` | Labeled input with focus styling |
| `SegmentedControl` | Inline option picker |
| `SelectField` | Modal-based searchable single-select (used for large option lists e.g. timezone, locale, currency) |
| `StatTile` | Compact metric tile with tone indicator |
| `EmptyState` | Zero-data placeholder |
| `ListItem` | Row with title/subtitle/meta/trailing/children |
| `InlineMessage` | Contextual feedback banner (`info/success/warn/error`) |
| `BottomTabBar` | Animated floating glass tab navigator |

Component rules:
- Buttons: minimum touch height `48dp`.
- Text fields: minimum touch height `48dp` with visible focus border using `focusRing` color.
- Status messages: semantic tone only — never ad-hoc color.
- List rows: title + secondary context + predictable trailing slot.

## Accessibility Rules

- Text contrast: minimum WCAG AA (4.5:1 for normal text).
- Non-text contrast: minimum 3:1 for UI indicators.
- Touch target size: minimum 44pt / 48dp for all interactive controls.
- Focus visibility: visible focus ring using `focusRing` token.
- Dynamic text: preserve core layout readability at large text sizes.

## Do / Don't

Do:
- Use semantic color roles from `theme.color.*`.
- Keep one clear primary action per card or section.
- Use explicit form labels and short helper text.
- Implement empty, loading, and error states on every primary screen.
- Use `createStyles()` for all StyleSheet definitions.

Don't:
- Hardcode hex colors in screen or component files.
- Mix multiple CTA hierarchies in one view.
- Hide destructive actions without clear intent messaging.
- Depend on color alone to communicate critical state.
- Import `theme` tokens outside of `createStyles` callbacks (breaks future theming).

## External References

- Apple Design Tips: https://developer.apple.com/design/tips/
- Apple Accessibility Tips: https://developer.apple.com/design/tips/accessibility
- Android Design: https://developer.android.com/design
- WCAG 2.2 Quick Reference: https://www.w3.org/WAI/WCAG22/quickref/?versions=2.2
- WCAG Contrast Minimum: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum
- WCAG Non-text Contrast: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast
- WCAG Target Size Minimum: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- WCAG Focus Visible: https://www.w3.org/WAI/WCAG22/Understanding/focus-visible
- NN/g 10 Usability Heuristics: https://www.nngroup.com/articles/ten-usability-heuristics/
