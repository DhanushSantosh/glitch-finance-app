import type { FastifyBaseLogger } from "fastify";
import { Redis } from "ioredis";
import { createDbClient } from "./db/client.js";
import { applyRuntimeMigrations } from "./db/migrate.js";
import { env, AppEnv } from "./env.js";
import { RateLimiter } from "./rate-limit/rate-limiter.js";
import { AuditService } from "./modules/audit/service.js";
import { AlertsService } from "./modules/alerts/service.js";
import { ConsoleOtpProvider, OtpDeliveryProvider, ResendOtpProvider } from "./modules/auth/provider.js";
import { AuthService } from "./modules/auth/service.js";
import { ensureDefaultCategories } from "./modules/categories/defaults.js";
import { SloMonitorService } from "./modules/slo/service.js";

export type AppContext = {
  env: AppEnv;
  db: ReturnType<typeof createDbClient>["db"];
  sql: ReturnType<typeof createDbClient>["sql"];
  redis: Redis | null;
  rateLimiter: RateLimiter;
  auditService: AuditService;
  alertsService: AlertsService;
  sloMonitorService: SloMonitorService;
  authService: AuthService;
};

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const collectErrorCodes = (error: unknown): string[] => {
  if (!error || typeof error !== "object") {
    return [];
  }

  const current = error as { code?: string; cause?: unknown; errors?: unknown[] };
  const codes: string[] = [];

  if (typeof current.code === "string") {
    codes.push(current.code);
  }

  // AggregateError (thrown by postgres.js when all resolved addresses fail)
  // stores sub-errors directly on `error.errors`, not in `error.cause`.
  const errorLists: unknown[] = [];
  if (Array.isArray(current.errors)) {
    errorLists.push(...current.errors);
  }

  if (current.cause && typeof current.cause === "object") {
    const cause = current.cause as { code?: string; errors?: unknown[] };
    if (typeof cause.code === "string") {
      codes.push(cause.code);
    }
    if (Array.isArray(cause.errors)) {
      errorLists.push(...cause.errors);
    }
  }

  for (const nested of errorLists) {
    if (nested && typeof nested === "object") {
      const nestedError = nested as { code?: string };
      if (typeof nestedError.code === "string") {
        codes.push(nestedError.code);
      }
    }
  }

  return codes;
};

const isConnectionRefusedError = (error: unknown): boolean => collectErrorCodes(error).includes("ECONNREFUSED");

const waitForDatabase = async (
  sql: ReturnType<typeof createDbClient>["sql"],
  logger: FastifyBaseLogger,
  maxAttempts = env.NODE_ENV === "development" ? 60 : 5,
  retryDelayMs = 1000
): Promise<void> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await sql`select 1 as ok`;
      if (attempt > 1) {
        logger.info({ attempt }, "Database became reachable.");
      }
      return;
    } catch (error) {
      if (!isConnectionRefusedError(error) || attempt === maxAttempts) {
        throw error;
      }

      logger.warn(
        { attempt, maxAttempts, retryDelayMs },
        "Database not reachable yet. Waiting before retrying startup checks."
      );
      await sleep(retryDelayMs);
    }
  }
};

export const createAppContext = async (logger: FastifyBaseLogger): Promise<AppContext> => {
  const { db, sql } = createDbClient(env.DATABASE_URL);
  await waitForDatabase(sql, logger);
  await applyRuntimeMigrations(db, logger);
  await ensureDefaultCategories(db);

  let redis: Redis | null = null;
  try {
    const redisClient = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false
    });
    await redisClient.connect();
    redis = redisClient;
    logger.info("Redis connected");
  } catch (error) {
    logger.warn({ error }, "Redis unavailable. Falling back to in-memory rate limit store.");
  }

  const rateLimiter = new RateLimiter(redis);
  const auditService = new AuditService(db);
  const alertsService = new AlertsService({
    logger,
    enabled: Boolean(env.ALERTS_WEBHOOK_URL),
    webhookUrl: env.ALERTS_WEBHOOK_URL,
    cooldownMs: env.ALERTS_COOLDOWN_SECONDS * 1000,
    serviceName: "glitch-api",
    environment: env.NODE_ENV
  });
  const sloMonitorService = new SloMonitorService({
    logger,
    alertsService,
    enabled: env.SLO_MONITOR_ENABLED,
    evaluationIntervalMs: env.SLO_MONITOR_EVALUATION_SECONDS * 1000,
    windowMs: env.SLO_MONITOR_WINDOW_SECONDS * 1000,
    http5xxRateThresholdPercent: env.SLO_HTTP_5XX_RATE_THRESHOLD_PERCENT,
    http5xxMinRequests: env.SLO_HTTP_5XX_MIN_REQUESTS,
    otpDeliveryFailureThreshold: env.SLO_OTP_DELIVERY_FAILURE_THRESHOLD
  });
  const otpProvider: OtpDeliveryProvider =
    env.OTP_PROVIDER === "resend"
      ? new ResendOtpProvider({
          apiKey: env.RESEND_API_KEY ?? "",
          fromEmail: env.OTP_EMAIL_FROM,
          requestTimeoutMs: env.OTP_PROVIDER_REQUEST_TIMEOUT_MS,
          logger
        })
      : new ConsoleOtpProvider(logger, { exposeDebugOtp: env.DEBUG_OTP_EXPOSURE });

  const authService = new AuthService({
    db,
    env,
    rateLimiter,
    auditService,
    alertsService,
    sloMonitorService,
    otpProvider
  });

  return {
    env,
    db,
    sql,
    redis,
    rateLimiter,
    auditService,
    alertsService,
    sloMonitorService,
    authService
  };
};

export const closeAppContext = async (ctx: AppContext): Promise<void> => {
  ctx.sloMonitorService.stop();
  await ctx.sql.end({ timeout: 5 });
  if (ctx.redis) {
    await ctx.redis.quit();
  }
};
