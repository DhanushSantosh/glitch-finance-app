CREATE TYPE "public"."auth_provider" AS ENUM('otp', 'google', 'apple', 'merged');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_id" varchar(128);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "apple_id" varchar(128);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_provider" "auth_provider" DEFAULT 'otp' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_google_id_unique" ON "users" USING btree ("google_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_apple_id_unique" ON "users" USING btree ("apple_id");