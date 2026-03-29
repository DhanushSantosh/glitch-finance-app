CREATE TABLE "avatar_assets" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"avatar_key" varchar(220) NOT NULL,
	"mime_type" varchar(32) NOT NULL,
	"content_base64" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "avatar_assets" ADD CONSTRAINT "avatar_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "avatar_assets_key_unique" ON "avatar_assets" USING btree ("avatar_key");