export type ColorRoles = {
  bgBase: string;
  bgElevated: string;
  surface: string;
  surfaceMuted: string;
  borderSubtle: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  actionPrimary: string;
  actionPrimaryPressed: string;
  actionSecondary: string;
  actionSecondaryPressed: string;
  actionGhost: string;
  actionGhostPressed: string;
  actionDanger: string;
  actionDangerPressed: string;
  statusSuccess: string;
  statusWarn: string;
  statusError: string;
  statusInfo: string;
  focusRing: string;
};

export type SpacingScale = {
  none: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
};

export type RadiusScale = {
  sm: number;
  md: number;
  lg: number;
  pill: number;
};

export type ElevationScale = {
  card: {
    shadowColor: string;
    shadowOpacity: number;
    shadowRadius: number;
    shadowOffset: {
      width: number;
      height: number;
    };
    elevation: number;
  };
};

export type TypeScale = {
  display: number;
  title: number;
  heading: number;
  body: number;
  bodySmall: number;
  caption: number;
  label: number;
};

export type MotionSpec = {
  durationFast: number;
  durationNormal: number;
  easingStandard: "ease-in-out";
};

export type StateSpec = {
  disabledOpacity: number;
  pressedOpacity: number;
};

export type ThemeTokens = {
  color: ColorRoles;
  spacing: SpacingScale;
  radius: RadiusScale;
  elevation: ElevationScale;
  typography: TypeScale;
  motion: MotionSpec;
  state: StateSpec;
};
