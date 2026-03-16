import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { createAppContext, closeAppContext } from "./context.js";
import { AppError, toClientAppError } from "./errors.js";
import { registerHealthRoutes } from "./modules/health/routes.js";
import { registerAuthRoutes } from "./modules/auth/routes.js";
import { registerCategoryRoutes } from "./modules/categories/routes.js";
import { registerTransactionRoutes } from "./modules/transactions/routes.js";
import { registerConsentRoutes } from "./modules/consents/routes.js";
import { registerBudgetRoutes } from "./modules/budgets/routes.js";
import { registerGoalRoutes } from "./modules/goals/routes.js";
import { registerReportRoutes } from "./modules/reports/routes.js";
import { registerImportRoutes } from "./modules/imports/routes.js";
import { registerMetricsRoutes } from "./modules/metrics/routes.js";
import { registerProfileRoutes } from "./modules/profile/routes.js";

export const createApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "development" ? "info" : "warn"
    }
  });

  const ctx = await createAppContext(app.log);
  ctx.sloMonitorService.start();

  app.decorateRequest("auth", null);

  await app.register(cors, {
    origin: [ctx.env.MOBILE_APP_ORIGIN, "http://localhost:19006", "http://localhost:8081"],
    credentials: true
  });

  app.addHook("onRequest", async (request) => {
    request.auth = await ctx.authService.resolveAuth(request.headers.authorization);
  });

  app.addHook("onResponse", async (_, reply) => {
    ctx.sloMonitorService.observeHttpResponse(reply.statusCode);
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

    const clientError = toClientAppError(error);
    if (clientError) {
      return reply.status(clientError.statusCode).send({
        error: {
          code: clientError.code,
          message: clientError.message,
          details: clientError.details
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
  await registerProfileRoutes(app, ctx);
  await registerConsentRoutes(app, ctx);
  await registerImportRoutes(app, ctx);
  await registerMetricsRoutes(app);

  app.addHook("onClose", async () => {
    await closeAppContext(ctx);
  });

  return app;
};
