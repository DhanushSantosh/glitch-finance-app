import { describe, expect, it } from "vitest";
import { darkTheme, lightTheme } from "./tokens";
import { ColorRoles, ThemeTokens } from "./types";

const requiredColorRoles: Array<keyof ColorRoles> = [
  "bgBase",
  "bgElevated",
  "surface",
  "surfaceMuted",
  "borderSubtle",
  "borderStrong",
  "textPrimary",
  "textSecondary",
  "textMuted",
  "textInverse",
  "actionPrimary",
  "actionPrimaryPressed",
  "actionSecondary",
  "actionSecondaryPressed",
  "actionGhost",
  "actionGhostPressed",
  "actionDanger",
  "actionDangerPressed",
  "statusSuccess",
  "statusWarn",
  "statusError",
  "statusInfo",
  "focusRing"
];

const assertThemeIntegrity = (tokens: ThemeTokens) => {
  for (const key of requiredColorRoles) {
    expect(tokens.color[key], `Missing color role: ${String(key)}`).toBeTruthy();
  }

  expect(tokens.spacing.none).toBe(0);
  expect(tokens.spacing.xs).toBeGreaterThan(tokens.spacing.none);
  expect(tokens.spacing.sm).toBeGreaterThan(tokens.spacing.xs);
  expect(tokens.spacing.md).toBeGreaterThan(tokens.spacing.sm);
  expect(tokens.spacing.lg).toBeGreaterThan(tokens.spacing.md);

  expect(tokens.radius.pill).toBeGreaterThan(tokens.radius.lg);
  expect(tokens.state.disabledOpacity).toBeGreaterThan(0);
  expect(tokens.state.disabledOpacity).toBeLessThan(1);
  expect(tokens.state.pressedOpacity).toBeGreaterThan(0);
  expect(tokens.state.pressedOpacity).toBeLessThanOrEqual(1);
};

describe("theme tokens", () => {
  it("defines all required semantic roles for light theme", () => {
    assertThemeIntegrity(lightTheme);
  });

  it("defines all required semantic roles for dark-ready theme", () => {
    assertThemeIntegrity(darkTheme);
  });

  it("keeps light and dark palettes distinct", () => {
    expect(lightTheme.color.bgBase).not.toBe(darkTheme.color.bgBase);
    expect(lightTheme.color.textPrimary).not.toBe(darkTheme.color.textPrimary);
    expect(lightTheme.color.actionPrimary).not.toBe(darkTheme.color.actionPrimary);
  });
});
