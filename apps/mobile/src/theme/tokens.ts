import { ThemeTokens } from "./types";

const common = {
  spacing: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    pill: 999
  },
  typography: {
    display: 30,
    title: 24,
    heading: 18,
    body: 16,
    bodySmall: 14,
    caption: 12,
    label: 13
  },
  motion: {
    durationFast: 140,
    durationNormal: 220,
    easingStandard: "ease-in-out" as const
  },
  state: {
    disabledOpacity: 0.55,
    pressedOpacity: 0.88
  }
};

export const lightTheme: ThemeTokens = {
  ...common,
  color: {
    bgBase: "#EFF8F7",
    bgElevated: "#E8F4F4",
    surface: "#FFFFFF",
    surfaceMuted: "#F5FAFA",
    borderSubtle: "#D4E8E8",
    borderStrong: "#A9CCCC",
    textPrimary: "#163336",
    textSecondary: "#2C555A",
    textMuted: "#5C7A7F",
    textInverse: "#F8FFFF",
    actionPrimary: "#2E8B89",
    actionPrimaryPressed: "#257170",
    actionSecondary: "#DDF0EF",
    actionSecondaryPressed: "#C6E5E4",
    actionGhost: "#F3FAFA",
    actionGhostPressed: "#E3F2F1",
    actionDanger: "#C4514C",
    actionDangerPressed: "#A63E39",
    statusSuccess: "#2E8A60",
    statusWarn: "#B7842F",
    statusError: "#BE4A46",
    statusInfo: "#367C99",
    focusRing: "#65A9A8"
  },
  elevation: {
    card: {
      shadowColor: "#0E2A2D",
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: {
        width: 0,
        height: 3
      },
      elevation: 2
    }
  }
};

export const darkTheme: ThemeTokens = {
  ...common,
  color: {
    bgBase: "#0E1A1D",
    bgElevated: "#112226",
    surface: "#152A2E",
    surfaceMuted: "#1A3136",
    borderSubtle: "#264247",
    borderStrong: "#3F696F",
    textPrimary: "#E5F4F4",
    textSecondary: "#C7DDDD",
    textMuted: "#96B3B5",
    textInverse: "#0B1B1D",
    actionPrimary: "#5DB4B2",
    actionPrimaryPressed: "#4B9A98",
    actionSecondary: "#1F3E42",
    actionSecondaryPressed: "#264A4F",
    actionGhost: "#1A3337",
    actionGhostPressed: "#214145",
    actionDanger: "#D9736F",
    actionDangerPressed: "#C55D58",
    statusSuccess: "#61C394",
    statusWarn: "#E0B45A",
    statusError: "#E67772",
    statusInfo: "#79B8D1",
    focusRing: "#73B9B7"
  },
  elevation: {
    card: {
      shadowColor: "#000000",
      shadowOpacity: 0.32,
      shadowRadius: 12,
      shadowOffset: {
        width: 0,
        height: 4
      },
      elevation: 3
    }
  }
};
