import { ExchangeRateSnapshot } from "../types";
import { formatMoney } from "./format";
import { RegionalPreferences } from "./regional";

export const convertDisplayAmount = (
  amount: number,
  sourceCurrency: string,
  snapshot: ExchangeRateSnapshot | null
): number | null => {
  if (!snapshot) {
    return null;
  }

  const from = sourceCurrency.trim().toUpperCase();
  const base = snapshot.baseCurrency.trim().toUpperCase();

  if (from === base) {
    return Number(amount.toFixed(2));
  }

  const sourceRate = snapshot.rates[from];
  if (!sourceRate || !Number.isFinite(sourceRate) || sourceRate <= 0) {
    return null;
  }

  return Number((amount / sourceRate).toFixed(2));
};

export const shouldShowConvertedAmount = (
  sourceCurrency: string,
  snapshot: ExchangeRateSnapshot | null
): boolean => {
  if (!snapshot) {
    return false;
  }

  return sourceCurrency.trim().toUpperCase() !== snapshot.baseCurrency.trim().toUpperCase();
};

export type MoneyDisplay = {
  amount: number;
  currency: string;
  primaryLabel: string;
  secondaryLabel: string | null;
  isConverted: boolean;
};

export const buildMoneyDisplay = (
  amount: number,
  sourceCurrency: string,
  regionalPreferences: RegionalPreferences,
  snapshot: ExchangeRateSnapshot | null
): MoneyDisplay => {
  const normalizedSourceCurrency = sourceCurrency.trim().toUpperCase();
  const convertedAmount = convertDisplayAmount(amount, normalizedSourceCurrency, snapshot);
  const isConverted = shouldShowConvertedAmount(normalizedSourceCurrency, snapshot) && convertedAmount !== null;
  const displayAmount = isConverted ? convertedAmount : amount;
  const displayCurrency = isConverted && snapshot ? snapshot.baseCurrency : normalizedSourceCurrency;

  return {
    amount: displayAmount,
    currency: displayCurrency,
    primaryLabel: formatMoney(displayAmount, displayCurrency, regionalPreferences),
    secondaryLabel: isConverted ? formatMoney(amount, normalizedSourceCurrency, regionalPreferences) : null,
    isConverted
  };
};
