import { FastifyInstance } from "fastify";
import { API_SERVICE_NAME, APP_BRAND_NAME } from "../../appMetadata.js";
import { AppContext } from "../../context.js";
import { AppError } from "../../errors.js";
import { isValidOtpSenderAddress } from "../auth/provider.js";

export const registerHealthRoutes = async (app: FastifyInstance, ctx: AppContext): Promise<void> => {
  app.get("/health", async () => {
    return {
      status: "ok",
      service: API_SERVICE_NAME,
      time: new Date().toISOString()
    };
  });

  app.get("/api/v1/status", async () => {
    if (!ctx.env.STATUS_ENDPOINT_ENABLED) {
      throw new AppError(404, "STATUS_ENDPOINT_DISABLED", "Not found.");
    }

    let databaseHealthy = true;
    try {
      await ctx.sql`select 1 as ok`;
    } catch {
      databaseHealthy = false;
    }

    let redisHealthy = false;
    if (ctx.redis) {
      try {
        redisHealthy = (await ctx.redis.ping()) === "PONG";
      } catch {
        redisHealthy = false;
      }
    }

    const otpProvider = ctx.env.OTP_PROVIDER;
    const otpProviderReady =
      otpProvider === "resend"
        ? Boolean(ctx.env.RESEND_API_KEY && isValidOtpSenderAddress(ctx.env.OTP_EMAIL_FROM))
        : ctx.env.NODE_ENV !== "production";

    return {
      message: `${APP_BRAND_NAME} API is running`,
      databaseUrlSet: Boolean(ctx.env.DATABASE_URL),
      redisUrlSet: Boolean(ctx.env.REDIS_URL),
      otpDelivery: {
        provider: otpProvider,
        ready: otpProviderReady,
        requestTimeoutMs: ctx.env.OTP_PROVIDER_REQUEST_TIMEOUT_MS
      },
      dependencies: {
        databaseHealthy,
        redisHealthy
      }
    };
  });

  app.get("/api/v1/bootstrap", async () => {
    return {
      appName: "Quantex25",
      currency: ctx.env.APP_CURRENCY,
      locale: "en-IN",
      timezone: "UTC",
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
