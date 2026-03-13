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
    // Single atomic INSERT WHERE NOT EXISTS prevents duplicate rows when multiple
    // app instances start concurrently (e.g. parallel integration test runs).
    await db.execute(
      sql`INSERT INTO categories (name, direction)
          SELECT ${category.name}, ${category.direction}::transaction_direction
          WHERE NOT EXISTS (
            SELECT 1 FROM categories
            WHERE name = ${category.name}
              AND direction = ${category.direction}::transaction_direction
              AND user_id IS NULL
          )`
    );
  }
};
