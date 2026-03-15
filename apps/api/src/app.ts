import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { createAppContext, closeAppContext } from "./context.js";
import { AppError } from "./errors.js";
import { registerHealthRoutes } from "./modules/health/routes.js";
import { registerAuthRoutes } from "./modules/auth/routes.js";
import { registerCategoryRoutes } from "./modules/categories/routes.js";
import { registerTransactionRoutes } from "./modules/transactions/routes.js";
import { registerConsentRoutes } from "./modules/consents/routes.js";
import { registerBudgetRoutes } from "./modules/budgets/routes.js";
import { registerGoalRoutes } from "./modules/goals/routes.js";
import { registerReportRoutes } from "./modules/reports/routes.js";
import { registerMetricsRoutes } from "./modules/metrics/routes.js";

export const createApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "development" ? "info" : "warn"
    }
  });

  const ctx = await createAppContext(app.log);

  app.decorateRequest("auth", null);

  await app.register(cors, {
    origin: [ctx.env.MOBILE_APP_ORIGIN, "http://localhost:19006", "http://localhost:8081"],
    credentials: true
  });

  app.addHook("onRequest", async (request) => {
    request.auth = await ctx.authService.resolveAuth(request.headers.authorization);
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        },
        requestId: request.id
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request payload",
          details: error.flatten()
        },
        requestId: request.id
      });
    }

    const httpStatusCode =
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : undefined;
    const errorCode = typeof (error as { code?: unknown }).code === "string" ? (error as { code: string }).code : undefined;
    const errorMessage =
      typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : "Invalid request.";

    if (httpStatusCode && httpStatusCode >= 400 && httpStatusCode < 500) {
      return reply.status(httpStatusCode).send({
        error: {
          code: errorCode ?? "BAD_REQUEST",
          message: errorMessage
        },
        requestId: request.id
      });
    }

    request.log.error({ err: error }, "Unhandled request error");
    void ctx.alertsService.notify({
      severity: "error",
      title: "Unhandled API error",
      message: "A request failed with an unhandled server error.",
      fingerprint: `http_5xx:${request.method}:${request.routeOptions.url ?? request.url}`,
      metadata: {
        requestId: request.id,
        method: request.method,
        route: request.routeOptions.url ?? request.url,
        statusCode: 500
      }
    });
    return reply.status(500).send({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong."
      },
      requestId: request.id
    });
  });

  await registerHealthRoutes(app, ctx);
  await registerAuthRoutes(app, ctx);
  await registerCategoryRoutes(app, ctx);
  await registerTransactionRoutes(app, ctx);
  await registerBudgetRoutes(app, ctx);
  await registerGoalRoutes(app, ctx);
  await registerReportRoutes(app, ctx);
  await registerConsentRoutes(app, ctx);
  await registerMetricsRoutes(app);

  app.addHook("onClose", async () => {
    await closeAppContext(ctx);
  });

  return app;
};
