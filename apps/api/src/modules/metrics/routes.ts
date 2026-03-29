import { FastifyInstance, FastifyRequest } from "fastify";
import { collectDefaultMetrics, Counter, Histogram, Registry } from "prom-client";
import { AppError } from "../../errors.js";

const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry, prefix: "glitch_api_" });

const httpRequestCount = new Counter({
  name: "glitch_api_http_requests_total",
  help: "Total HTTP requests handled by the API",
  labelNames: ["method", "route", "status_code"] as const,
  registers: [metricsRegistry]
});

const httpRequestDuration = new Histogram({
  name: "glitch_api_http_request_duration_ms",
  help: "HTTP request duration in milliseconds",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [10, 25, 50, 75, 100, 200, 400, 800, 1200, 2000, 5000],
  registers: [metricsRegistry]
});

const getRouteLabel = (request: FastifyRequest): string => {
  const routePattern = request.routeOptions.url;
  if (typeof routePattern === "string" && routePattern.length > 0) {
    return routePattern;
  }

  const rawUrl = request.raw.url ?? "unknown";
  const queryIndex = rawUrl.indexOf("?");
  return queryIndex >= 0 ? rawUrl.slice(0, queryIndex) : rawUrl;
};

export const registerMetricsRoutes = async (app: FastifyInstance, metricsEnabled = true): Promise<void> => {
  app.addHook("onResponse", async (request, reply) => {
    const route = getRouteLabel(request);
    const labels = {
      method: request.method,
      route,
      status_code: String(reply.statusCode)
    };

    httpRequestCount.inc(labels);
    httpRequestDuration.observe(labels, reply.elapsedTime);
  });

  app.get("/api/v1/metrics", async (_, reply) => {
    if (!metricsEnabled) {
      throw new AppError(404, "METRICS_ENDPOINT_DISABLED", "Not found.");
    }
    reply.header("content-type", metricsRegistry.contentType);
    return metricsRegistry.metrics();
  });
};
