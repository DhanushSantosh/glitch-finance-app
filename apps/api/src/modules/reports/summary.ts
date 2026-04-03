import { and, eq, gte, lt } from "drizzle-orm";
import { DbClient } from "../../db/client.js";
import { categories, transactions } from "../../db/schema.js";
import { getMonthWindowForTimeZone } from "../../utils/regional.js";
import { convertAmount, ExchangeRateSnapshot } from "../fx/service.js";

export type ReportSummaryPayload = {
  month: string;
  period: {
    start: string;
    endExclusive: string;
  };
  totals: {
    income: number;
    expense: number;
    transfer: number;
    net: number;
    transactionCount: number;
    currency: string;
  };
  topCategories: Array<{
    categoryId: string | null;
    categoryName: string;
    amount: number;
    transactionCount: number;
    currency: string;
  }>;
  dailySeries: Array<{
    date: string;
    income: number;
    expense: number;
    net: number;
    currency: string;
  }>;
};

const parseMoney = (value: string | number): number => Number(value);

const formatDateToken = (year: number, month: number, day: number): string =>
  `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const listDateTokensForMonth = (monthToken: string): string[] => {
  const [yearRaw, monthRaw] = monthToken.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const tokens: string[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    tokens.push(formatDateToken(year, month, day));
  }

  return tokens;
};

const getDateTokenForTimeZone = (value: Date, formatter: Intl.DateTimeFormat): string => {
  const parts = formatter.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
};

export const buildReportSummary = async (input: {
  db: DbClient;
  userId: string;
  month: string;
  currency: string;
  timezone: string;
  top: number;
  exchangeSnapshot: ExchangeRateSnapshot;
}): Promise<ReportSummaryPayload> => {
  const { start, end } = getMonthWindowForTimeZone(input.month, input.timezone);

  const windowFilter = and(eq(transactions.userId, input.userId), gte(transactions.occurredAt, start), lt(transactions.occurredAt, end));

  const rows = await input.db
    .select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      direction: transactions.direction,
      amount: transactions.amount,
      currency: transactions.currency,
      occurredAt: transactions.occurredAt
    })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(windowFilter);

  const totals = {
    income: 0,
    expense: 0,
    transfer: 0,
    net: 0,
    transactionCount: 0,
    currency: input.currency
  };

  const topCategoryMap = new Map<
    string,
    { categoryId: string | null; categoryName: string; amount: number; transactionCount: number }
  >();
  const dailyMap = new Map<string, { income: number; expense: number }>();
  for (const token of listDateTokensForMonth(input.month)) {
    dailyMap.set(token, { income: 0, expense: 0 });
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: input.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  for (const row of rows) {
    const convertedAmount = convertAmount(parseMoney(row.amount), row.currency, input.currency, input.exchangeSnapshot);
    totals.transactionCount += 1;

    if (row.direction === "credit") {
      totals.income += convertedAmount;
    } else if (row.direction === "debit") {
      totals.expense += convertedAmount;
      const categoryKey = row.categoryId ?? "uncategorized";
      const existingCategory = topCategoryMap.get(categoryKey) ?? {
        categoryId: row.categoryId,
        categoryName: row.categoryName ?? "Uncategorized",
        amount: 0,
        transactionCount: 0
      };
      existingCategory.amount += convertedAmount;
      existingCategory.transactionCount += 1;
      topCategoryMap.set(categoryKey, existingCategory);
    } else {
      totals.transfer += convertedAmount;
    }

    const dayToken = getDateTokenForTimeZone(row.occurredAt, formatter);
    const dailyEntry = dailyMap.get(dayToken);
    if (dailyEntry) {
      if (row.direction === "credit") {
        dailyEntry.income += convertedAmount;
      } else if (row.direction === "debit") {
        dailyEntry.expense += convertedAmount;
      }
    }
  }

  totals.income = Number(totals.income.toFixed(2));
  totals.expense = Number(totals.expense.toFixed(2));
  totals.transfer = Number(totals.transfer.toFixed(2));
  totals.net = Number((totals.income - totals.expense).toFixed(2));

  const topCategories = Array.from(topCategoryMap.values())
    .sort((left, right) => {
      if (right.amount !== left.amount) {
        return right.amount - left.amount;
      }
      return left.categoryName.localeCompare(right.categoryName);
    })
    .slice(0, input.top)
    .map((row) => ({
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    amount: Number(row.amount.toFixed(2)),
    transactionCount: row.transactionCount,
    currency: input.currency
  }));

  const dailySeries = Array.from(dailyMap.entries()).map(([date, values]) => {
    const income = Number(values.income.toFixed(2));
    const expense = Number(values.expense.toFixed(2));
    return {
      date,
      income,
      expense,
      net: Number((income - expense).toFixed(2)),
      currency: input.currency
    };
  });

  return {
    month: input.month,
    period: {
      start: start.toISOString(),
      endExclusive: end.toISOString()
    },
    totals,
    topCategories,
    dailySeries
  };
};
