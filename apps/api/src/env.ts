import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: process.env.ENV_FILE ?? ".env" });

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return value;
}, z.boolean());

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    API_HOST: z.string().default("0.0.0.0"),
    MOBILE_APP_ORIGIN: z.string().url().default("http://localhost:8081"),
    DATABASE_URL: z.string().min(1).default("postgresql://glitch:glitch@localhost:5432/glitch"),
    REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
    OTP_HASH_SECRET: z.string().min(16).default("change-me-in-production-otp-secret"),
    OTP_PROVIDER: z.enum(["console", "resend"]).default("console"),
    OTP_EMAIL_FROM: z.string().min(3).default("Glitch Finance <noreply@glitch.local>"),
    OTP_PROVIDER_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(10000),
    RESEND_API_KEY: z.string().min(1).optional(),
    ALERTS_WEBHOOK_URL: z.string().url().optional(),
    ALERTS_COOLDOWN_SECONDS: z.coerce.number().int().min(10).max(3600).default(60),
    SLO_MONITOR_ENABLED: booleanFromEnv.default(false),
    SLO_MONITOR_WINDOW_SECONDS: z.coerce.number().int().min(60).max(3600).default(300),
    SLO_MONITOR_EVALUATION_SECONDS: z.coerce.number().int().min(10).max(300).default(30),
    SLO_HTTP_5XX_RATE_THRESHOLD_PERCENT: z.coerce.number().min(0.1).max(100).default(2),
    SLO_HTTP_5XX_MIN_REQUESTS: z.coerce.number().int().min(1).max(10000).default(100),
    SLO_OTP_DELIVERY_FAILURE_THRESHOLD: z.coerce.number().int().min(1).max(1000).default(5),
    AUTH_OTP_TTL_SECONDS: z.coerce.number().int().min(60).max(1800).default(300),
    AUTH_MAX_OTP_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
    AUTH_SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    AUTH_MAX_ACTIVE_SESSIONS: z.coerce.number().int().min(1).max(20).default(5),
    AUTH_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    AUTH_RATE_LIMIT_MAX_REQUEST_OTP: z.coerce.number().int().min(1).max(20).default(5),
    AUTH_RATE_LIMIT_MAX_VERIFY_OTP: z.coerce.number().int().min(1).max(30).default(10),
    SMS_IMPORT_SCAN_ENABLED: booleanFromEnv.default(false),
    SMS_DISCLOSURE_VERSION: z.string().default("sms_disclosure_v1"),
    APP_CURRENCY: z.string().length(3).default("INR"),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    APPLE_APP_BUNDLE_ID: z.string().min(1).optional()
  })
  .superRefine((value, refinementContext) => {
    if (value.OTP_PROVIDER === "resend" && !value.RESEND_API_KEY) {
      refinementContext.addIssue({
        code: z.ZodIssueCode.custom,
        message: "RESEND_API_KEY is required when OTP_PROVIDER=resend",
        path: ["RESEND_API_KEY"]
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type AppEnv = typeof env;
