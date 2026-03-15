import type { FastifyBaseLogger } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AlertsService } from "./service.js";

const createLoggerStub = (): FastifyBaseLogger =>
  ({
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn()
  }) as unknown as FastifyBaseLogger;

describe("AlertsService", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("does not send when service is disabled", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const service = new AlertsService({
      logger: createLoggerStub(),
      enabled: false,
      webhookUrl: "https://example.com/alerts",
      cooldownMs: 1000,
      serviceName: "glitch-api",
      environment: "test"
    });

    await service.notify({
      severity: "error",
      title: "Disabled path",
      message: "Should not send"
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends webhook payload when enabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => ""
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const service = new AlertsService({
      logger: createLoggerStub(),
      enabled: true,
      webhookUrl: "https://example.com/alerts",
      cooldownMs: 1000,
      serviceName: "glitch-api",
      environment: "test"
    });

    await service.notify({
      severity: "critical",
      title: "OTP delivery failed",
      message: "Test payload",
      fingerprint: "otp_delivery_failed:test"
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://example.com/alerts");
    expect(requestInit.method).toBe("POST");
    const body = JSON.parse(String(requestInit.body)) as {
      severity: string;
      service: string;
      environment: string;
      fingerprint: string;
    };
    expect(body.severity).toBe("critical");
    expect(body.service).toBe("glitch-api");
    expect(body.environment).toBe("test");
    expect(body.fingerprint).toBe("otp_delivery_failed:test");
  });

  it("throttles duplicate alerts during cooldown window", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => ""
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const service = new AlertsService({
      logger: createLoggerStub(),
      enabled: true,
      webhookUrl: "https://example.com/alerts",
      cooldownMs: 60_000,
      serviceName: "glitch-api",
      environment: "test"
    });

    const payload = {
      severity: "error" as const,
      title: "Repeated error",
      message: "Should be sent once",
      fingerprint: "duplicate-key"
    };

    await service.notify(payload);
    await service.notify(payload);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
