import { FastifyInstance } from "fastify";
import { AppContext } from "../../context.js";

export const registerHealthRoutes = async (app: FastifyInstance, ctx: AppContext): Promise<void> => {
  app.get("/health", async () => {
    return {
      status: "ok",
      service: "glitch-api",
      time: new Date().toISOString(),
      env: ctx.env.NODE_ENV
    };
  });

  app.get("/api/v1/status", async () => {
    return {
      message: "Glitch API is running",
      databaseUrlSet: Boolean(ctx.env.DATABASE_URL),
      redisUrlSet: Boolean(ctx.env.REDIS_URL)
    };
  });

  app.get("/api/v1/bootstrap", async () => {
    return {
      appName: "Quantex25",
      currency: ctx.env.APP_CURRENCY,
      featureFlags: {
        smsImportEnabledByDefault: false,
        aiInsightsEnabled: false
      },
      legal: {
        smsDisclosureVersion: ctx.env.SMS_DISCLOSURE_VERSION
      }
    };
  });
};
