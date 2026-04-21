import { ZodError } from "zod";
import * as Sentry from "@sentry/node";
import { AppError, toClientAppError } from "../errors.js";
import { env } from "../env.js";

type ApiExceptionContext = {
  requestId?: string;
  method?: string;
  route?: string;
  statusCode?: number;
  userId?: string;
  email?: string;
  tags?: Record<string, string>;
  extras?: Record<string, unknown>;
};

let initialized = false;

const resolveSentryEnvironment = (): string => env.SENTRY_ENVIRONMENT ?? env.NODE_ENV;

export const isSentryEnabled = (): boolean => Boolean(env.SENTRY_DSN);

export const initServerSentry = (): void => {
  if (initialized || !isSentryEnabled()) {
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: resolveSentryEnvironment(),
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    sendDefaultPii: false,
    enabled: true,
    initialScope: {
      tags: {
        service: "glitch-api",
        runtime: "fastify"
      }
    }
  });

  initialized = true;
};

export const shouldReportErrorToSentry = (error: unknown): boolean => {
  if (error instanceof AppError) {
    return error.statusCode >= 500;
  }

  if (error instanceof ZodError) {
    return false;
  }

  const clientError = toClientAppError(error);
  if (clientError) {
    return clientError.statusCode >= 500;
  }

  return true;
};

export const captureApiException = (error: unknown, context: ApiExceptionContext = {}): void => {
  if (!isSentryEnabled() || !shouldReportErrorToSentry(error)) {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag("service", "glitch-api");
    scope.setTag("environment", resolveSentryEnvironment());

    if (context.method) {
      scope.setTag("http.method", context.method);
    }

    if (context.route) {
      scope.setTag("http.route", context.route);
    }

    if (typeof context.statusCode === "number") {
      scope.setTag("http.status_code", String(context.statusCode));
    }

    if (context.requestId) {
      scope.setTag("request_id", context.requestId);
    }

    if (context.userId || context.email) {
      scope.setUser({
        ...(context.userId ? { id: context.userId } : {}),
        ...(context.email ? { email: context.email } : {})
      });
    }

    if (context.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }

    if (context.extras) {
      for (const [key, value] of Object.entries(context.extras)) {
        scope.setExtra(key, value);
      }
    }

    Sentry.captureException(error);
  });
};
