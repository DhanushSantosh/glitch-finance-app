import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export type DbClient = PostgresJsDatabase<typeof schema>;

export const createDbClient = (databaseUrl: string): { db: DbClient; sql: postgres.Sql } => {
  const sql = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false
  });

  return {
    db: drizzle(sql, { schema }),
    sql
  };
};
