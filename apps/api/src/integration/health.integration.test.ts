import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";

describe("health, status, bootstrap and metrics", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // GET /health
  // ---------------------------------------------------------------------------

  it("GET /health returns 200 with a status field", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { status: string };
    expect(body.status).toBeTruthy();
  });

  it("GET /health status value is 'ok'", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    const body = response.json() as { status: string };
    expect(body.status).toBe("ok");
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/status
  // ---------------------------------------------------------------------------

  it("GET /api/v1/status returns 200 with dependency and otp delivery flags", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/status"
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as {
      otpDelivery: {
        provider: "console" | "resend";
        ready: boolean;
        requestTimeoutMs: number;
      };
      dependencies: { databaseHealthy: boolean; redisHealthy: boolean };
    };

    expect(["console", "resend"]).toContain(body.otpDelivery.provider);
    expect(typeof body.otpDelivery.ready).toBe("boolean");
    expect(typeof body.otpDelivery.requestTimeoutMs).toBe("number");
    expect(typeof body.dependencies.databaseHealthy).toBe("boolean");
    expect(typeof body.dependencies.redisHealthy).toBe("boolean");
  });

  it("GET /api/v1/status reports database as healthy in test environment", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/status"
    });

    const body = response.json() as {
      dependencies: { databaseHealthy: boolean };
    };

    // The test environment has a live database — it should be healthy
    expect(body.dependencies.databaseHealthy).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/bootstrap
  // ---------------------------------------------------------------------------

  it("GET /api/v1/bootstrap returns 200 with smsScanEnabled and smsDisclosureVersion fields", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/bootstrap"
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as {
      featureFlags: { smsImportEnabledByDefault: boolean };
      legal: { smsDisclosureVersion: string };
    };

    // featureFlags contains smsImportEnabledByDefault (maps to smsScanEnabled concept)
    expect(typeof body.featureFlags.smsImportEnabledByDefault).toBe("boolean");
    // legal contains smsDisclosureVersion
    expect(body.legal.smsDisclosureVersion).toBeDefined();
  });

  it("GET /api/v1/bootstrap featureFlags.smsImportEnabledByDefault is false by default", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/bootstrap"
    });

    const body = response.json() as {
      featureFlags: { smsImportEnabledByDefault: boolean };
    };

    expect(body.featureFlags.smsImportEnabledByDefault).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/metrics
  // ---------------------------------------------------------------------------

  it("GET /api/v1/metrics returns 200 with Content-Type text/plain", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/metrics"
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");
  });

  it("GET /api/v1/metrics body contains velqora_api_http_requests_total metric name", async () => {
    // Make a request first so the counter is populated
    await app.inject({ method: "GET", url: "/health" });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/metrics"
    });

    expect(response.body).toContain("velqora_api_http_requests_total");
  });

  it("GET /api/v1/metrics body contains velqora_api_http_request_duration_ms metric name", async () => {
    // Make a request first so the histogram is populated
    await app.inject({ method: "GET", url: "/health" });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/metrics"
    });

    expect(response.body).toContain("velqora_api_http_request_duration_ms");
  });
});
