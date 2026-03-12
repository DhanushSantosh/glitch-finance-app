import { ThemeTokens } from "./types";

const common = {
  spacing: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 36
  },
  radius: {
    sm: 12,
    md: 18,
    lg: 24,
    pill: 999
  },
  typography: {
    display: 34,
    title: 26,
    heading: 20,
    body: 16,
    bodySmall: 14,
    caption: 12,
    label: 13
  },
  motion: {
    durationFast: 120,
    durationNormal: 200,
    easingStandard: "ease-in-out" as const
  },
  state: {
    disabledOpacity: 0.4,
    pressedOpacity: 0.8
  }
};

export const lightTheme: ThemeTokens = {
  ...common,
  color: {
    bgBase: "#F8FAFC",
    bgElevated: "#F1F5F9",
    surface: "#FFFFFF",
    surfaceMuted: "#F8FAFC",
    borderSubtle: "#E2E8F0",
    borderStrong: "#CBD5E1",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
    textMuted: "#94A3B8",
    textInverse: "#FFFFFF",
    actionPrimary: "#0EA5E9",
    actionPrimaryPressed: "#0284C7",
    actionSecondary: "#E0F2FE",
    actionSecondaryPressed: "#BAE6FD",
    actionGhost: "#F1F5F9",
    actionGhostPressed: "#E2E8F0",
    actionDanger: "#EF4444",
    actionDangerPressed: "#DC2626",
    statusSuccess: "#10B981",
    statusWarn: "#F59E0B",
    statusError: "#EF4444",
    statusInfo: "#3B82F6",
    focusRing: "#7DD3FC"
  },
  elevation: {
    card: {
      shadowColor: "#000000",
      shadowOpacity: 0.05,
      shadowRadius: 15,
      shadowOffset: {
        width: 0,
        height: 4
      },
      elevation: 2
    }
  }
};

export const darkTheme: ThemeTokens = {
  ...common,
  color: {
    bgBase: "#000000", // True Black
    bgElevated: "#0A0A0A", // Extremely dark gray
    surface: "#121212", // Pure minimal surface
    surfaceMuted: "rgba(255, 255, 255, 0.03)", // Ultra-subtle glass
    borderSubtle: "rgba(255, 255, 255, 0.06)", // Barely visible borders
    borderStrong: "rgba(255, 255, 255, 0.12)",
    textPrimary: "#FFFFFF",
    textSecondary: "#A3A3A3",
    textMuted: "#666666",
    textInverse: "#000000",
    actionPrimary: "#D4FF00", // High-energy Chartreuse / Lime
    actionPrimaryPressed: "#B8DF00",
    actionSecondary: "rgba(255, 255, 255, 0.08)",
    actionSecondaryPressed: "rgba(255, 255, 255, 0.15)",
    actionGhost: "transparent",
    actionGhostPressed: "rgba(255, 255, 255, 0.05)",
    actionDanger: "#FF3366", // Sharp aggressive red/pink
    actionDangerPressed: "#E62E5C",
    statusSuccess: "#D4FF00", // Using the brand color for success
    statusWarn: "#FFB020",
    statusError: "#FF3366",
    statusInfo: "#3388FF",
    focusRing: "rgba(212, 255, 0, 0.4)"
  },
  elevation: {
    card: {
      shadowColor: "#000000",
      shadowOpacity: 0.5,
      shadowRadius: 16,
      shadowOffset: {
        width: 0,
        height: 8
      },
      elevation: 0 // Rely on borders and background contrast in true black
    }
  }
};


