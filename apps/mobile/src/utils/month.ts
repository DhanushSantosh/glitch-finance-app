const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export const isValidMonthToken = (value: string): boolean => MONTH_PATTERN.test(value);

export const shiftMonthToken = (monthToken: string, deltaMonths: number): string => {
  if (!isValidMonthToken(monthToken)) {
    throw new Error("Month token must match YYYY-MM.");
  }

  const [yearRaw, monthRaw] = monthToken.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  const base = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  base.setUTCMonth(base.getUTCMonth() + deltaMonths);

  const nextYear = base.getUTCFullYear();
  const nextMonth = String(base.getUTCMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
};
