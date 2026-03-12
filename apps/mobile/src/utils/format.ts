export const formatMoney = (value: number, currency = "INR"): string => {
  const normalizedCurrency = currency.toUpperCase();
  const symbol = normalizedCurrency === "INR" ? "₹" : `${normalizedCurrency} `;
  return `${symbol}${value.toFixed(2)}`;
};

export const formatDateTime = (iso: string): string => new Date(iso).toLocaleString();

export const formatDateToken = (dateToken: string): string => {
  const [yearRaw, monthRaw, dayRaw] = dateToken.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const parsed = new Date(year, month - 1, day);
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const isNonEmpty = (value: string): boolean => value.trim().length > 0;
