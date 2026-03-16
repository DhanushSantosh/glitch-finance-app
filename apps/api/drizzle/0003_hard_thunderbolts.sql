CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"first_name" varchar(80),
	"last_name" varchar(80),
	"display_name" varchar(120),
	"phone_number" varchar(24),
	"date_of_birth" date,
	"avatar_url" varchar(2048),
	"city" varchar(120),
	"country" varchar(120),
	"timezone" varchar(80) DEFAULT 'UTC' NOT NULL,
	"locale" varchar(35) DEFAULT 'en-IN' NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"occupation" varchar(120),
	"bio" varchar(280),
	"push_notifications_enabled" boolean DEFAULT true NOT NULL,
	"email_notifications_enabled" boolean DEFAULT true NOT NULL,
	"weekly_summary_enabled" boolean DEFAULT true NOT NULL,
	"biometrics_enabled" boolean DEFAULT false NOT NULL,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_profiles_timezone_idx" ON "user_profiles" USING btree ("timezone");