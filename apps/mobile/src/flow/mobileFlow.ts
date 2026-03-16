import { getCurrentMonthTokenForTimeZone } from "../utils/regional";

export type AuthStage = "login" | "otp" | "authenticated";

export const deriveAuthStage = (pendingEmail: string, isAuthenticated: boolean): AuthStage => {
  if (isAuthenticated) {
    return "authenticated";
  }

  if (pendingEmail.trim().length > 0) {
    return "otp";
  }

  return "login";
};

export const resolveSmsIntentOutcome = (requestedEnabled: boolean) => ({
  requestedEnabled,
  enabled: false,
  featureAvailable: false
});

export const canSubmitTransaction = (amountText: string, occurredAtIsoLike: string): boolean => {
  const amount = Number(amountText);
  if (!Number.isFinite(amount) || amount <= 0) {
    return false;
  }

  const parsed = new Date(occurredAtIsoLike);
  return !Number.isNaN(parsed.getTime());
};

export const getCurrentMonthToken = (timeZone?: string, now?: Date): string => getCurrentMonthTokenForTimeZone(timeZone, now);
