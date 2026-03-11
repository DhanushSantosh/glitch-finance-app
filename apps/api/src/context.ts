import type { FastifyBaseLogger } from "fastify";
import { Redis } from "ioredis";
import { createDbClient } from "./db/client.js";
import { env, AppEnv } from "./env.js";
import { RateLimiter } from "./rate-limit/rate-limiter.js";
import { AuditService } from "./modules/audit/service.js";
import { ConsoleOtpProvider } from "./modules/auth/provider.js";
import { AuthService } from "./modules/auth/service.js";
import { ensureDefaultCategories } from "./modules/categories/defaults.js";

export type AppContext = {
  env: AppEnv;
  db: ReturnType<typeof createDbClient>["db"];
  sql: ReturnType<typeof createDbClient>["sql"];
  redis: Redis | null;
  rateLimiter: RateLimiter;
  auditService: AuditService;
  authService: AuthService;
};

export const createAppContext = async (logger: FastifyBaseLogger): Promise<AppContext> => {
  const { db, sql } = createDbClient(env.DATABASE_URL);
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
  const otpProvider = new ConsoleOtpProvider(logger);

  const authService = new AuthService({
    db,
    env,
    rateLimiter,
    auditService,
    otpProvider
  });

  return {
    env,
    db,
    sql,
    redis,
    rateLimiter,
    auditService,
    authService
  };
};

export const closeAppContext = async (ctx: AppContext): Promise<void> => {
  await ctx.sql.end({ timeout: 5 });
  if (ctx.redis) {
    await ctx.redis.quit();
  }
};
