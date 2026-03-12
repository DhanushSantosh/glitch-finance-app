# UI Style Guide (Soft Aqua)

## Purpose
This document is the source of truth for mobile UI decisions in the Soft Aqua revamp.
It aligns implementation with design principles from Apple HIG guidance, Android design guidance, WCAG 2.2, and NN/g usability heuristics.

## Brand Tone
- Calm and trustworthy for daily money decisions.
- Clear hierarchy before visual decoration.
- Friendly without playful ambiguity in financial data.

## Design Principles
- Clarity first: users should understand "where they are" and "what to do next" within one glance.
- Progressive disclosure: show core information first, reveal advanced detail only when needed.
- Consistency over novelty: component behavior is predictable across all screens.
- Guardrailed trust: privacy and consent states are explicit, never hidden.
- Accessibility by default: contrast, touch size, and readable text are baseline requirements.

## Token Source of Truth
- `apps/mobile/src/theme/types.ts`
- `apps/mobile/src/theme/tokens.ts`
- `apps/mobile/src/theme/index.ts`

## Color Roles
Semantic colors only. Do not use raw hex values in screen files.

Light theme roles:
- Background: `bgBase`, `bgElevated`
- Surface: `surface`, `surfaceMuted`
- Borders: `borderSubtle`, `borderStrong`
- Text: `textPrimary`, `textSecondary`, `textMuted`, `textInverse`
- Actions: `actionPrimary`, `actionSecondary`, `actionGhost`, `actionDanger`
- Feedback: `statusSuccess`, `statusWarn`, `statusError`, `statusInfo`
- Focus: `focusRing`

Dark-ready map:
- Fully defined in tokens.
- Not active in this phase.

## Typography Scale
- `display`: 30
- `title`: 24
- `heading`: 18
- `body`: 16
- `bodySmall`: 14
- `caption`: 12
- `label`: 13

Usage rules:
- One `title` per screen section header.
- Financial values should use `heading` or bold `body` for scanability.
- Captions are only for metadata, not actions.

## Spacing, Radius, Elevation
Spacing scale:
- `xs`: 4
- `sm`: 8
- `md`: 12
- `lg`: 16
- `xl`: 20
- `xxl`: 28

Radius scale:
- `sm`: 10
- `md`: 14
- `lg`: 18
- `pill`: 999

Elevation:
- `elevation.card` only for surfaced card containers.

## Motion and Interaction
- Motion is subtle and performance-safe.
- Use `durationFast` for pressed transitions.
- Use `durationNormal` for content-state transitions.
- Pressed state uses `pressedOpacity`.
- Disabled controls use `disabledOpacity`.

## Navigation Pattern
- Bottom tabs are the default app-level navigation:
  - Dashboard
  - Transactions
  - Budgets
  - Goals
  - Settings
- Create/edit flows are modal-stack style routes under their owning tab.

## Component Standards
Shared primitives:
- `Screen`
- `AppHeader`
- `Card`
- `Button`
- `TextField`
- `SegmentedControl`
- `StatTile`
- `EmptyState`
- `ListItem`
- `InlineMessage`
- `BottomTabBar`

Rules:
- Buttons: min touch height 48.
- Text fields: min touch height 48 and visible focus border.
- Status messages: semantic tone only (`info|success|warn|error`).
- List rows: title + secondary context + predictable trailing content.

## Accessibility Rules
- Text contrast: minimum WCAG AA target (4.5:1 for normal-size text).
- Non-text contrast: minimum 3:1 for UI indicators and boundaries.
- Target size: minimum 44pt/48dp equivalent for interactive controls.
- Focus visibility: visible focus ring or equivalent visual state.
- Dynamic text: preserve core layout readability at larger text settings.

## Do / Don't
Do:
- Use semantic color roles from theme tokens.
- Keep one clear primary action per card or section.
- Keep form labels explicit and helper text short.
- Use empty/loading/error states on every primary screen.

Don't:
- Hardcode hex colors in screens.
- Mix multiple CTA hierarchies in one view.
- Hide destructive actions without clear intent messaging.
- Depend on color alone to communicate critical state.

## External References
- Apple Design Tips: https://developer.apple.com/design/tips/
- Apple UI Do's and Don'ts: https://developer.apple.com/design/tips/ui-design-dos-and-donts/
- Apple Accessibility Tips: https://developer.apple.com/design/tips/accessibility
- Android Design: https://developer.android.com/design
- Android Foundations: https://developer.android.com/design/ui/mobile/guides/foundations
- Android Adaptive Design (Large Screens): https://developer.android.com/design/ui/mobile/guides/layout-and-content/adaptive-design-large-screens
- WCAG 2.2 Quick Reference: https://www.w3.org/WAI/WCAG22/quickref/?versions=2.2
- WCAG Contrast Minimum: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum
- WCAG Non-text Contrast: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast
- WCAG Target Size Minimum: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- WCAG Focus Visible: https://www.w3.org/WAI/WCAG22/Understanding/focus-visible
- NN/g 10 Usability Heuristics: https://www.nngroup.com/articles/ten-usability-heuristics/
