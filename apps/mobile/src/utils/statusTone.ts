import { lightTheme } from "../theme/tokens";

export type StatusTone = "success" | "warn" | "error" | "info";

export const getStatusColor = (tone: StatusTone): string => {
  if (tone === "success") return lightTheme.color.statusSuccess;
  if (tone === "warn") return lightTheme.color.statusWarn;
  if (tone === "error") return lightTheme.color.statusError;
  return lightTheme.color.statusInfo;
};
