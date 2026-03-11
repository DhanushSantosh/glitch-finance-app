import { and, eq, isNull } from "drizzle-orm";
import { DbClient } from "../../db/client.js";
import { categories } from "../../db/schema.js";

const defaultCategories: Array<{ name: string; direction: "debit" | "credit" | "transfer" }> = [
  { name: "Food & Dining", direction: "debit" },
  { name: "Groceries", direction: "debit" },
  { name: "Transport", direction: "debit" },
  { name: "Bills", direction: "debit" },
  { name: "Shopping", direction: "debit" },
  { name: "Healthcare", direction: "debit" },
  { name: "Salary", direction: "credit" },
  { name: "Refund", direction: "credit" },
  { name: "Transfer", direction: "transfer" }
];

export const ensureDefaultCategories = async (db: DbClient): Promise<void> => {
  for (const category of defaultCategories) {
    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.name, category.name), eq(categories.direction, category.direction), isNull(categories.userId)))
      .limit(1);

    if (!existing[0]) {
      await db.insert(categories).values({
        name: category.name,
        direction: category.direction,
        userId: null
      });
    }
  }
};
