import { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppContext } from "../../context.js";
import { requireAuth } from "../../utils/auth.js";
import { normalizeCurrency } from "../../utils/regional.js";
import { parseOrThrow } from "../../utils/validation.js";
import { getExchangeRateSnapshot, mapRatesFromBaseCurrency } from "./service.js";

const fxQuerySchema = z.object({
  base: z.string().length(3).optional()
});

export const registerFxRoutes = async (app: FastifyInstance, ctx: AppContext): Promise<void> => {
  app.get("/api/v1/fx/latest", async (request) => {
    const identity = requireAuth(request);
    const query = parseOrThrow(fxQuerySchema, request.query);

    const snapshot = await getExchangeRateSnapshot({
      redis: ctx.redis,
      logger: request.log,
      nodeEnv: ctx.env.NODE_ENV
    });

    const baseCurrency = normalizeCurrency(query.base, ctx.env.APP_CURRENCY);

    await ctx.auditService.log({
      userId: identity.userId,
      action: "fx.latest",
      entityType: "exchange_rate_snapshot",
      metadata: {
        provider: snapshot.provider,
        baseCurrency,
        asOf: snapshot.asOf
      },
      requestId: request.id,
      ipAddress: request.ip
    });

    return {
      provider: snapshot.provider,
      asOf: snapshot.asOf,
      baseCurrency,
      rates: mapRatesFromBaseCurrency(baseCurrency, snapshot)
    };
  });
};
