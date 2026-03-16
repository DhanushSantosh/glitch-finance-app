import { eq } from "drizzle-orm";
import { DbClient } from "../db/client.js";
import { userProfiles } from "../db/schema.js";

export type RegionalPreferences = {
  timezone: string;
  locale: string;
  currency: string;
};

const currencyPattern = /^[A-Z]{3}$/;
const monthTokenPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

const formatToParts = (date: Date, timeZone: string): Intl.DateTimeFormatPart[] =>
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

const getPartValue = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string =>
  parts.find((part) => part.type === type)?.value ?? "";

const getTimeZoneOffsetMs = (timeZone: string, date: Date): number => {
  const parts = formatToParts(date, timeZone);
  const year = Number(getPartValue(parts, "year"));
  const month = Number(getPartValue(parts, "month"));
  const day = Number(getPartValue(parts, "day"));
  const hour = Number(getPartValue(parts, "hour"));
  const minute = Number(getPartValue(parts, "minute"));
  const second = Number(getPartValue(parts, "second"));
  const asUtcTimestamp = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtcTimestamp - date.getTime();
};

const zonedDateTimeToUtc = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): Date => {
  const initialUtcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const firstOffset = getTimeZoneOffsetMs(timeZone, initialUtcGuess);
  const firstPass = new Date(initialUtcGuess.getTime() - firstOffset);
  const secondOffset = getTimeZoneOffsetMs(timeZone, firstPass);

  if (secondOffset === firstOffset) {
    return firstPass;
  }

  return new Date(initialUtcGuess.getTime() - secondOffset);
};

export const isSupportedTimeZone = (value: string): boolean => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
};

export const isSupportedLocale = (value: string): boolean => Intl.DateTimeFormat.supportedLocalesOf([value]).length > 0;

export const isSupportedCurrency = (value: string): boolean => {
  if (!currencyPattern.test(value)) {
    return false;
  }

  try {
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: value
    }).format(1);
    return true;
  } catch {
    return false;
  }
};

export const normalizeCurrency = (value: string | undefined | null, fallback: string): string => {
  const normalized = value?.trim().toUpperCase();
  if (!normalized || !isSupportedCurrency(normalized)) {
    return fallback;
  }
  return normalized;
};

export const normalizeLocale = (value: string | undefined | null, fallback: string): string => {
  const normalized = value?.trim();
  if (!normalized || !isSupportedLocale(normalized)) {
    return fallback;
  }
  return normalized;
};

export const normalizeTimeZone = (value: string | undefined | null, fallback: string): string => {
  const normalized = value?.trim();
  if (!normalized || !isSupportedTimeZone(normalized)) {
    return fallback;
  }
  return normalized;
};

export const getCurrentMonthTokenForTimeZone = (timeZone: string, now = new Date()): string => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit"
  });
  const parts = formatter.formatToParts(now);
  const year = getPartValue(parts, "year");
  const month = getPartValue(parts, "month");
  return `${year}-${month}`;
};

export const getMonthWindowForTimeZone = (monthToken: string, timeZone: string): { start: Date; end: Date } => {
  if (!monthTokenPattern.test(monthToken)) {
    throw new Error("Month token must match YYYY-MM.");
  }

  const [yearRaw, monthRaw] = monthToken.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  const start = zonedDateTimeToUtc(year, month, 1, 0, 0, 0, timeZone);
  const end = month === 12 ? zonedDateTimeToUtc(year + 1, 1, 1, 0, 0, 0, timeZone) : zonedDateTimeToUtc(year, month + 1, 1, 0, 0, 0, timeZone);

  return { start, end };
};

export const resolveUserRegionalPreferences = async (
  db: DbClient,
  userId: string,
  defaults: RegionalPreferences
): Promise<RegionalPreferences> => {
  const rows = await db
    .select({
      timezone: userProfiles.timezone,
      locale: userProfiles.locale,
      currency: userProfiles.currency
    })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  const row = rows[0];

  return {
    timezone: normalizeTimeZone(row?.timezone, defaults.timezone),
    locale: normalizeLocale(row?.locale, defaults.locale),
    currency: normalizeCurrency(row?.currency, defaults.currency)
  };
};

