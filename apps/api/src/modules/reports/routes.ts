import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import { FastifyInstance } from "fastify";
import { AppContext } from "../../context.js";
import { categories, transactions } from "../../db/schema.js";
import { requireAuth } from "../../utils/auth.js";
import { parseOrThrow } from "../../utils/validation.js";
import { getMonthWindow, reportSummaryQuerySchema, resolveReportMonth } from "./validation.js";

const parseMoney = (value: string | number): number => Number(value);
const parseCount = (value: string | number): number => Number(value);

const formatDateToken = (value: Date): string => value.toISOString().slice(0, 10);

const listDateTokens = (start: Date, endExclusive: Date): string[] => {
  const tokens: string[] = [];
  const cursor = new Date(start.getTime());

  while (cursor < endExclusive) {
    tokens.push(formatDateToken(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return tokens;
};

export const registerReportRoutes = async (app: FastifyInstance, ctx: AppContext): Promise<void> => {
  app.get("/api/v1/reports/summary", async (request) => {
    const identity = requireAuth(request);
    const query = parseOrThrow(reportSummaryQuerySchema, request.query);
    const month = resolveReportMonth(query.month);
    const currency = (query.currency ?? ctx.env.APP_CURRENCY).toUpperCase();
    const { start, end } = getMonthWindow(month);

    const windowFilter = and(
      eq(transactions.userId, identity.userId),
      eq(transactions.currency, currency),
      gte(transactions.occurredAt, start),
      lt(transactions.occurredAt, end)
    );

    const totalRows = await ctx.db
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
      currency
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

    const topCategoryRows = await ctx.db
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
      .limit(query.top);

    const topCategories = topCategoryRows.map((row) => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      amount: Number(parseMoney(row.spentAmount).toFixed(2)),
      transactionCount: parseCount(row.transactionCount),
      currency
    }));

    const dayBucketExpr = sql`date_trunc('day', timezone('UTC', ${transactions.occurredAt}))`;

    const dailyRows = await ctx.db
      .select({
        day: sql<string>`to_char(${dayBucketExpr}, 'YYYY-MM-DD')`,
        direction: transactions.direction,
        totalAmount: sql<string>`coalesce(sum(${transactions.amount}), 0)`
      })
      .from(transactions)
      .where(windowFilter)
      .groupBy(dayBucketExpr, transactions.direction)
      .orderBy(asc(dayBucketExpr));

    const dailyMap = new Map<string, { income: number; expense: number }>();
    for (const token of listDateTokens(start, end)) {
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
        currency
      };
    });

    return {
      month,
      period: {
        start: start.toISOString(),
        endExclusive: end.toISOString()
      },
      totals,
      topCategories,
      dailySeries
    };
  });
};
