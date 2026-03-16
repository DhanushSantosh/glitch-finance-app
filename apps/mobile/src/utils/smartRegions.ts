import { City, Country, ICountry } from "country-state-city";
import { localeOptions } from "./regionalOptions";

type Option = {
  value: string;
  label: string;
};

type CountryRegionData = {
  code: string;
  name: string;
  currency: string;
  locale: string;
  timezone: string;
};

const fallbackCurrency = "USD";
const fallbackLocale = "en-US";
const fallbackTimeZone = "UTC";

const localeSet = new Set(localeOptions.map((option) => option.value));

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
  if (!/^[A-Z]{3}$/.test(value)) {
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

const allCountries = Country.getAllCountries().sort((left, right) => left.name.localeCompare(right.name));

const countriesByCode = new Map(allCountries.map((country) => [country.isoCode.toUpperCase(), country]));
const countriesByName = new Map(allCountries.map((country) => [country.name.trim().toLowerCase(), country.isoCode.toUpperCase()]));

const resolveCountryLocale = (countryCode: string): string => {
  const exactLocaleMatches = localeOptions
    .map((option) => option.value)
    .filter((locale) => locale.toUpperCase().endsWith(`-${countryCode}`) && isSupportedLocale(locale));

  if (exactLocaleMatches.length > 0) {
    return exactLocaleMatches[0];
  }

  const englishCandidate = `en-${countryCode}`;
  if (localeSet.has(englishCandidate) && isSupportedLocale(englishCandidate)) {
    return englishCandidate;
  }

  return fallbackLocale;
};

const resolveCountryCurrency = (country: ICountry): string => {
  const normalized = (country.currency ?? "").trim().toUpperCase();
  return isSupportedCurrency(normalized) ? normalized : fallbackCurrency;
};

const resolveCountryTimeZone = (country: ICountry): string => {
  const firstZone = country.timezones?.[0]?.zoneName?.trim();
  return firstZone && isSupportedTimeZone(firstZone) ? firstZone : fallbackTimeZone;
};

export const countryOptions: Option[] = allCountries.map((country) => ({
  value: country.isoCode.toUpperCase(),
  label: country.name
}));

const cityOptionsCache = new Map<string, Option[]>();

export const getCountryCodeFromValue = (input: string): string => {
  const normalized = input.trim();
  if (!normalized) {
    return "";
  }

  const upperCode = normalized.toUpperCase();
  if (countriesByCode.has(upperCode)) {
    return upperCode;
  }

  const byName = countriesByName.get(normalized.toLowerCase());
  return byName ?? "";
};

export const getCountryByCode = (countryCode: string): CountryRegionData | null => {
  const country = countriesByCode.get(countryCode.toUpperCase());
  if (!country) {
    return null;
  }

  const code = country.isoCode.toUpperCase();

  return {
    code,
    name: country.name,
    currency: resolveCountryCurrency(country),
    locale: resolveCountryLocale(code),
    timezone: resolveCountryTimeZone(country)
  };
};

export const getCityOptionsForCountry = (countryCode: string): Option[] => {
  const normalizedCode = countryCode.trim().toUpperCase();
  if (!normalizedCode) {
    return [];
  }

  const cached = cityOptionsCache.get(normalizedCode);
  if (cached) {
    return cached;
  }

  const citySet = new Set<string>();
  const cities = City.getCitiesOfCountry(normalizedCode) ?? [];
  for (const city of cities) {
    const name = city.name.trim();
    if (name.length > 0) {
      citySet.add(name);
    }
  }

  const options = Array.from(citySet)
    .sort((left, right) => left.localeCompare(right))
    .map((city) => ({
      value: city,
      label: city
    }));

  cityOptionsCache.set(normalizedCode, options);
  return options;
};
