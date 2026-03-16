type RegionalFormatSettings = {
  locale?: string;
  timezone?: string;
};

const fallbackLocale = "en-IN";
const fallbackTimezone = "UTC";
const fallbackCurrency = "INR";
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

const resolveLocale = (settings?: RegionalFormatSettings): string => {
  const locale = settings?.locale?.trim();
  if (locale && isSupportedLocale(locale)) {
    return locale;
  }
  const deviceLocale = Intl.DateTimeFormat().resolvedOptions().locale;
  return isSupportedLocale(deviceLocale) ? deviceLocale : fallbackLocale;
};

const resolveTimeZone = (settings?: RegionalFormatSettings): string => {
  const timezone = settings?.timezone?.trim();
  if (timezone && isSupportedTimeZone(timezone)) {
    return timezone;
  }
  const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return deviceTimezone && isSupportedTimeZone(deviceTimezone) ? deviceTimezone : fallbackTimezone;
};

const resolveCurrency = (currency: string): string => {
  const normalizedCurrency = currency.trim().toUpperCase();
  if (isSupportedCurrency(normalizedCurrency)) {
    return normalizedCurrency;
  }
  return fallbackCurrency;
};

export const formatMoney = (value: number, currency = fallbackCurrency, settings?: RegionalFormatSettings): string => {
  const locale = resolveLocale(settings);
  const normalizedCurrency = resolveCurrency(currency);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: normalizedCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export const formatDateTime = (iso: string, settings?: RegionalFormatSettings): string => {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat(resolveLocale(settings), {
    timeZone: resolveTimeZone(settings),
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsed);
};

export const formatDateOnly = (iso: string, settings?: RegionalFormatSettings): string => {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat(resolveLocale(settings), {
    timeZone: resolveTimeZone(settings),
    dateStyle: "medium"
  }).format(parsed);
};

export const formatDateToken = (dateToken: string, settings?: RegionalFormatSettings): string => {
  const [yearRaw, monthRaw, dayRaw] = dateToken.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  if (Number.isNaN(parsed.getTime())) {
    return dateToken;
  }

  return new Intl.DateTimeFormat(resolveLocale(settings), {
    timeZone: "UTC",
    month: "short",
    day: "numeric"
  }).format(parsed);
};

export const isNonEmpty = (value: string): boolean => value.trim().length > 0;
