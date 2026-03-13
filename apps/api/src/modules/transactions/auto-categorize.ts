import { and, asc, desc, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { DbClient } from "../../db/client.js";
import { categories, transactions } from "../../db/schema.js";

type TransactionDirection = "debit" | "credit" | "transfer";

type AutoCategoryInput = {
  db: DbClient;
  userId: string;
  direction: TransactionDirection;
  counterparty?: string | null;
  note?: string | null;
};

type KeywordRule = {
  direction: TransactionDirection;
  categoryName: string;
  keywords: string[];
};

const keywordRules: KeywordRule[] = [
  { direction: "debit", categoryName: "Food & Dining", keywords: ["restaurant", "cafe", "swiggy", "zomato", "dinner"] },
  { direction: "debit", categoryName: "Groceries", keywords: ["grocery", "supermarket", "mart", "kirana"] },
  { direction: "debit", categoryName: "Transport", keywords: ["uber", "ola", "metro", "fuel", "petrol", "diesel"] },
  { direction: "debit", categoryName: "Bills", keywords: ["electricity", "water bill", "internet", "broadband", "recharge"] },
  { direction: "debit", categoryName: "Shopping", keywords: ["amazon", "flipkart", "myntra", "store", "shopping"] },
  { direction: "debit", categoryName: "Healthcare", keywords: ["pharmacy", "hospital", "clinic", "medical"] },
  { direction: "credit", categoryName: "Salary", keywords: ["salary", "payroll", "stipend"] },
  { direction: "credit", categoryName: "Refund", keywords: ["refund", "reversal", "cashback"] }
];

const normalizeValue = (value: string | null | undefined): string => value?.trim().toLowerCase() ?? "";

const resolveCategoryByName = async (
  db: DbClient,
  userId: string,
  categoryName: string,
  direction: TransactionDirection
): Promise<string | null> => {
  const rows = await db
    .select({
      id: categories.id,
      userId: categories.userId
    })
    .from(categories)
    .where(
      and(
        eq(categories.direction, direction),
        sql`lower(${categories.name}) = ${categoryName.toLowerCase()}`,
        or(eq(categories.userId, userId), isNull(categories.userId))
      )
    )
    .orderBy(desc(categories.userId), asc(categories.id))
    .limit(5);

  if (!rows[0]) {
    return null;
  }

  const userSpecific = rows.find((row) => row.userId === userId);
  return userSpecific?.id ?? rows[0].id;
};

const inferFromCounterpartyHistory = async (
  db: DbClient,
  userId: string,
  direction: TransactionDirection,
  counterparty: string
): Promise<string | null> => {
  const normalizedCounterparty = normalizeValue(counterparty);
  if (normalizedCounterparty.length === 0) {
    return null;
  }

  const row = await db
    .select({
      categoryId: transactions.categoryId,
      occurrences: sql<number>`count(*)`,
      latestOccurredAt: sql<Date>`max(${transactions.occurredAt})`
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.direction, direction),
        isNotNull(transactions.categoryId),
        sql`lower(coalesce(${transactions.counterparty}, '')) = ${normalizedCounterparty}`
      )
    )
    .groupBy(transactions.categoryId)
    .orderBy(desc(sql`count(*)`), desc(sql`max(${transactions.occurredAt})`))
    .limit(1);

  return row[0]?.categoryId ?? null;
};

const inferFromKeywordRules = async (
  db: DbClient,
  userId: string,
  direction: TransactionDirection,
  text: string
): Promise<string | null> => {
  if (text.length === 0) {
    return null;
  }

  const matchingRule = keywordRules.find(
    (rule) => rule.direction === direction && rule.keywords.some((keyword) => text.includes(keyword))
  );

  if (!matchingRule) {
    return null;
  }

  return resolveCategoryByName(db, userId, matchingRule.categoryName, direction);
};

export const suggestCategoryIdForTransaction = async (input: AutoCategoryInput): Promise<string | null> => {
  if (input.direction === "transfer") {
    return resolveCategoryByName(input.db, input.userId, "Transfer", "transfer");
  }

  const fromHistory = await inferFromCounterpartyHistory(input.db, input.userId, input.direction, input.counterparty ?? "");
  if (fromHistory) {
    return fromHistory;
  }

  const normalizedText = `${normalizeValue(input.counterparty)} ${normalizeValue(input.note)}`.trim();
  const fromKeywords = await inferFromKeywordRules(input.db, input.userId, input.direction, normalizedText);
  if (fromKeywords) {
    return fromKeywords;
  }

  return null;
};

