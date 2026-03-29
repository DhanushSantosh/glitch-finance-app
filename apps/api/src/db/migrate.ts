import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { AppContext } from "../context.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(currentDirectory, "../../drizzle");

export const applyRuntimeMigrations = async (
  db: AppContext["db"],
  logger: { info: (context: object, message: string) => void }
): Promise<void> => {
  logger.info({ migrationsFolder }, "Applying database migrations before startup.");
  await migrate(db, { migrationsFolder });
  logger.info({ migrationsFolder }, "Database migrations are up to date.");
};
