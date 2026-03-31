import { sql } from "drizzle-orm";
import { DbClient } from "../../db/client.js";

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
    // ON CONFLICT DO NOTHING relies on the partial unique index
    // categories_global_name_direction_unique (name, direction) WHERE user_id IS NULL,
    // which makes this truly atomic and safe under concurrent startup (e.g. parallel
    // integration test workers all calling createApp() at the same time).
    await db.execute(
      sql`INSERT INTO categories (name, direction)
          VALUES (${category.name}, ${category.direction}::transaction_direction)
          ON CONFLICT (name, direction) WHERE user_id IS NULL
          DO NOTHING`
    );
  }
};
