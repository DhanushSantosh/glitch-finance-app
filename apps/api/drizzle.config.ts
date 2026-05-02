import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config({ path: process.env.ENV_FILE ?? ".env" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://velqora:velqora@localhost:5432/velqora"
  },
  strict: true,
  verbose: true
});
