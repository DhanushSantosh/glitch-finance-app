import { createApp } from "./app.js";
import { env } from "./env.js";
import { captureApiException, initServerSentry } from "./monitoring/sentry.js";

initServerSentry();

const collectErrorCodes = (error: unknown): string[] => {
  if (!error || typeof error !== "object") {
    return [];
  }

  const current = error as { code?: string; cause?: unknown };
  const codes: string[] = [];

  if (typeof current.code === "string") {
    codes.push(current.code);
  }

  if (current.cause && typeof current.cause === "object") {
    const cause = current.cause as { code?: string; errors?: unknown[] };
    if (typeof cause.code === "string") {
      codes.push(cause.code);
    }

    if (Array.isArray(cause.errors)) {
      for (const nested of cause.errors) {
        if (nested && typeof nested === "object") {
          const nestedError = nested as { code?: string };
          if (typeof nestedError.code === "string") {
            codes.push(nestedError.code);
          }
        }
      }
    }
  }

  return codes;
};

const isConnectionRefusedError = (error: unknown): boolean => collectErrorCodes(error).includes("ECONNREFUSED");

const start = async () => {
  let app: Awaited<ReturnType<typeof createApp>> | null = null;

  try {
    app = await createApp();
    await app.listen({ port: env.API_PORT, host: env.API_HOST });
  } catch (error) {
    if (app) {
      app.log.error({ err: error }, "API startup failed");
    } else {
      console.error("API startup failed before logger initialization.", error);
    }

    captureApiException(error, {
      tags: {
        phase: "startup"
      }
    });

    if (isConnectionRefusedError(error)) {
      console.error("Database connection refused.");
      console.error("Start local infrastructure with: pnpm db:up");
      console.error("Then run migrations with: pnpm --filter @glitch/api db:migrate");
    }

    process.exit(1);
  }
};

process.on("unhandledRejection", (reason) => {
  captureApiException(reason, {
    tags: {
      phase: "unhandledRejection"
    }
  });
});

process.on("uncaughtException", (error) => {
  captureApiException(error, {
    tags: {
      phase: "uncaughtException"
    }
  });

  console.error("Uncaught exception. Exiting process after reporting to Sentry.", error);
  process.exit(1);
});

await start();
