import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import { DbClient } from "../../db/client.js";
import { categories, transactions } from "../../db/schema.js";
import { getMonthWindowForTimeZone } from "../../utils/regional.js";

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
const parseCount = (value: string | number): number => Number(value);

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

export const buildReportSummary = async (input: {
  db: DbClient;
  userId: string;
  month: string;
  currency: string;
  timezone: string;
  top: number;
}): Promise<ReportSummaryPayload> => {
  const { start, end } = getMonthWindowForTimeZone(input.month, input.timezone);

  const windowFilter = and(
    eq(transactions.userId, input.userId),
    eq(transactions.currency, input.currency),
    gte(transactions.occurredAt, start),
    lt(transactions.occurredAt, end)
  );

  const totalRows = await input.db
    .select({
      direction: transactions.direction,
      totalAmount: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      transactionCount: sql<string>`count(*)`
    })
    .from(transactions)
    .where(windowFilter)
    .groupBy(transactions.direction);

  const totals = {
    income: 0,
    expense: 0,
    transfer: 0,
    net: 0,
    transactionCount: 0,
    currency: input.currency
  };

  for (const row of totalRows) {
    const amount = parseMoney(row.totalAmount);
    const count = parseCount(row.transactionCount);

    totals.transactionCount += count;

    if (row.direction === "credit") {
      totals.income += amount;
    } else if (row.direction === "debit") {
      totals.expense += amount;
    } else {
      totals.transfer += amount;
    }
  }

  totals.income = Number(totals.income.toFixed(2));
  totals.expense = Number(totals.expense.toFixed(2));
  totals.transfer = Number(totals.transfer.toFixed(2));
  totals.net = Number((totals.income - totals.expense).toFixed(2));

  const spentAmountExpr = sql`coalesce(sum(${transactions.amount}), 0)`;

  const topCategoryRows = await input.db
    .select({
      categoryId: transactions.categoryId,
      categoryName: sql<string>`coalesce(${categories.name}, 'Uncategorized')`,
      spentAmount: sql<string>`${spentAmountExpr}`,
      transactionCount: sql<string>`count(*)`
    })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(windowFilter, eq(transactions.direction, "debit")))
    .groupBy(transactions.categoryId, categories.name)
    .orderBy(desc(spentAmountExpr), asc(categories.name))
    .limit(input.top);

  const topCategories = topCategoryRows.map((row) => ({
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    amount: Number(parseMoney(row.spentAmount).toFixed(2)),
    transactionCount: parseCount(row.transactionCount),
    currency: input.currency
  }));

  const escapedTimeZone = input.timezone.replaceAll("'", "''");
  const timezoneLiteral = sql.raw(`'${escapedTimeZone}'`);
  const dayTokenExpr = sql<string>`to_char(timezone(${timezoneLiteral}, ${transactions.occurredAt}), 'YYYY-MM-DD')`;

  const dailyRows = await input.db
    .select({
      day: dayTokenExpr,
      direction: transactions.direction,
      totalAmount: sql<string>`coalesce(sum(${transactions.amount}), 0)`
    })
    .from(transactions)
    .where(windowFilter)
    .groupBy(dayTokenExpr, transactions.direction)
    .orderBy(asc(dayTokenExpr));

  const dailyMap = new Map<string, { income: number; expense: number }>();
  for (const token of listDateTokensForMonth(input.month)) {
    dailyMap.set(token, { income: 0, expense: 0 });
  }

  for (const row of dailyRows) {
    const entry = dailyMap.get(row.day);
    if (!entry) {
      continue;
    }

    const amount = parseMoney(row.totalAmount);
    if (row.direction === "credit") {
      entry.income += amount;
    } else if (row.direction === "debit") {
      entry.expense += amount;
    }
  }

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
