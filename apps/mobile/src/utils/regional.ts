import { BootstrapPayload, UserProfile } from "../types";

export type RegionalPreferences = {
  locale: string;
  timezone: string;
  currency: string;
};

const fallbackPreferences: RegionalPreferences = {
  locale: "en-IN",
  timezone: "UTC",
  currency: "INR"
};

const currencyPattern = /^[A-Z]{3}$/;

const isSupportedLocale = (value: string): boolean => Intl.DateTimeFormat.supportedLocalesOf([value]).length > 0;

const isSupportedTimeZone = (value: string): boolean => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
};

const isSupportedCurrency = (value: string): boolean => {
  if (!currencyPattern.test(value)) {
    return false;
  }

  try {
    new Intl.NumberFormat("en-US", { style: "currency", currency: value }).format(1);
    return true;
  } catch {
    return false;
  }
};

const resolveDeviceLocale = (): string => {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  return isSupportedLocale(locale) ? locale : fallbackPreferences.locale;
};

const resolveDeviceTimeZone = (): string => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timezone && isSupportedTimeZone(timezone) ? timezone : fallbackPreferences.timezone;
};

const resolveCurrency = (value: string | null | undefined, fallback: string): string => {
  const normalizedCurrency = value?.trim().toUpperCase();
  if (!normalizedCurrency || !isSupportedCurrency(normalizedCurrency)) {
    return fallback;
  }
  return normalizedCurrency;
};

const resolveLocale = (value: string | null | undefined, fallback: string): string => {
  const locale = value?.trim();
  if (!locale || !isSupportedLocale(locale)) {
    return fallback;
  }
  return locale;
};

const resolveTimeZone = (value: string | null | undefined, fallback: string): string => {
  const timezone = value?.trim();
  if (!timezone || !isSupportedTimeZone(timezone)) {
    return fallback;
  }
  return timezone;
};

export const getCurrentMonthTokenForTimeZone = (timeZone?: string, now = new Date()): string => {
  const timezone = resolveTimeZone(timeZone, resolveDeviceTimeZone());
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit"
  }).formatToParts(now);

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  return `${year}-${month}`;
};

export const resolveRegionalPreferences = (
  profile: UserProfile | null,
  bootstrap: BootstrapPayload | null
): RegionalPreferences => {
  const bootstrapLocale = bootstrap?.locale ?? null;
  const bootstrapTimezone = bootstrap?.timezone ?? null;
  const bootstrapCurrency = bootstrap?.currency ?? null;

  const localeFallback = resolveLocale(bootstrapLocale, resolveDeviceLocale());
  const timezoneFallback = resolveTimeZone(bootstrapTimezone, resolveDeviceTimeZone());
  const currencyFallback = resolveCurrency(bootstrapCurrency, fallbackPreferences.currency);

  return {
    locale: resolveLocale(profile?.locale, localeFallback),
    timezone: resolveTimeZone(profile?.timezone, timezoneFallback),
    currency: resolveCurrency(profile?.currency, currencyFallback)
  };
};

