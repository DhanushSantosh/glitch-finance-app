import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config({ path: process.env.ENV_FILE ?? ".env" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://glitch:glitch@localhost:5432/glitch"
  },
  strict: true,
  verbose: true
});
