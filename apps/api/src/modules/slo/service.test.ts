import type { FastifyBaseLogger } from "fastify";
import { describe, expect, it, vi } from "vitest";
import { SloMonitorService } from "./service.js";

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

const createService = (notifyMock: ReturnType<typeof vi.fn>): SloMonitorService =>
  new SloMonitorService({
    logger: createLoggerStub(),
    alertsService: {
      notify: notifyMock
    },
    enabled: true,
    evaluationIntervalMs: 30_000,
    windowMs: 300_000,
    http5xxRateThresholdPercent: 2,
    http5xxMinRequests: 100,
    otpDeliveryFailureThreshold: 5
  });

describe("SloMonitorService", () => {
  it("alerts when 5xx error rate exceeds threshold within request floor", async () => {
    const notifyMock = vi.fn().mockResolvedValue(undefined);
    const service = createService(notifyMock);
    const nowMs = 1_000_000;

    for (let index = 0; index < 100; index += 1) {
      service.observeHttpResponse(index < 3 ? 500 : 200, nowMs);
    }

    await service.evaluate(nowMs);

    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fingerprint: "slo:http_5xx_rate",
        severity: "critical"
      })
    );
  });

  it("does not alert for 5xx when minimum request volume is not met", async () => {
    const notifyMock = vi.fn().mockResolvedValue(undefined);
    const service = createService(notifyMock);
    const nowMs = 2_000_000;

    for (let index = 0; index < 99; index += 1) {
      service.observeHttpResponse(500, nowMs);
    }

    await service.evaluate(nowMs);

    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("alerts when otp delivery failures breach threshold", async () => {
    const notifyMock = vi.fn().mockResolvedValue(undefined);
    const service = createService(notifyMock);
    const nowMs = 3_000_000;

    for (let index = 0; index < 5; index += 1) {
      service.observeOtpDeliveryFailure(nowMs);
    }

    await service.evaluate(nowMs);

    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fingerprint: "slo:otp_delivery_failures",
        severity: "critical"
      })
    );
  });
});
