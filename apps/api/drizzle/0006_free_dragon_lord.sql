-- Remove any duplicate global categories that may have been inserted concurrently
-- (TOCTOU race in the old INSERT WHERE NOT EXISTS pattern). Keep the oldest row
-- (smallest created_at, then smallest id as tiebreaker) and let FK ON DELETE SET NULL
-- handle any transaction/budget references to the deleted duplicates.
DELETE FROM "categories"
WHERE "user_id" IS NULL
  AND "id" NOT IN (
    SELECT DISTINCT ON ("name", "direction") "id"
    FROM "categories"
    WHERE "user_id" IS NULL
    ORDER BY "name", "direction", "created_at" ASC, "id" ASC
  );
--> statement-breakpoint
CREATE UNIQUE INDEX "categories_global_name_direction_unique" ON "categories" USING btree ("name","direction") WHERE "user_id" IS NULL;
