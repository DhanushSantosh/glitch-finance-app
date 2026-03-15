import type { FastifyBaseLogger } from "fastify";
import type { AlertsService } from "../alerts/service.js";

type SloMonitorServiceOptions = {
  logger: FastifyBaseLogger;
  alertsService: Pick<AlertsService, "notify">;
  enabled: boolean;
  evaluationIntervalMs: number;
  windowMs: number;
  http5xxRateThresholdPercent: number;
  http5xxMinRequests: number;
  otpDeliveryFailureThreshold: number;
};

type SloBucket = {
  totalRequests: number;
  serverErrors: number;
  otpDeliveryFailures: number;
};

const DEFAULT_BUCKET_SIZE_MS = 10_000;

const createEmptyBucket = (): SloBucket => ({
  totalRequests: 0,
  serverErrors: 0,
  otpDeliveryFailures: 0
});

export class SloMonitorService {
  private readonly logger: FastifyBaseLogger;
  private readonly alertsService: Pick<AlertsService, "notify">;
  private readonly enabled: boolean;
  private readonly evaluationIntervalMs: number;
  private readonly windowMs: number;
  private readonly http5xxRateThresholdPercent: number;
  private readonly http5xxMinRequests: number;
  private readonly otpDeliveryFailureThreshold: number;
  private readonly bucketSizeMs = DEFAULT_BUCKET_SIZE_MS;
  private readonly buckets = new Map<number, SloBucket>();
  private evaluationInterval: ReturnType<typeof setInterval> | null = null;

  constructor(options: SloMonitorServiceOptions) {
    this.logger = options.logger;
    this.alertsService = options.alertsService;
    this.enabled = options.enabled;
    this.evaluationIntervalMs = options.evaluationIntervalMs;
    this.windowMs = options.windowMs;
    this.http5xxRateThresholdPercent = options.http5xxRateThresholdPercent;
    this.http5xxMinRequests = options.http5xxMinRequests;
    this.otpDeliveryFailureThreshold = options.otpDeliveryFailureThreshold;
  }

  private toBucketKey(timestampMs: number): number {
    return Math.floor(timestampMs / this.bucketSizeMs);
  }

  private getOrCreateBucket(timestampMs: number): SloBucket {
    const key = this.toBucketKey(timestampMs);
    const existing = this.buckets.get(key);
    if (existing) {
      return existing;
    }

    const created = createEmptyBucket();
    this.buckets.set(key, created);
    return created;
  }

  private pruneOldBuckets(nowMs: number): void {
    const oldestAllowedKey = this.toBucketKey(nowMs - this.windowMs);
    for (const key of this.buckets.keys()) {
      if (key < oldestAllowedKey) {
        this.buckets.delete(key);
      }
    }
  }

  private getWindowTotals(nowMs: number): SloBucket {
    const oldestAllowedKey = this.toBucketKey(nowMs - this.windowMs);
    const totals = createEmptyBucket();

    for (const [key, bucket] of this.buckets.entries()) {
      if (key < oldestAllowedKey) {
        continue;
      }

      totals.totalRequests += bucket.totalRequests;
      totals.serverErrors += bucket.serverErrors;
      totals.otpDeliveryFailures += bucket.otpDeliveryFailures;
    }

    return totals;
  }

  observeHttpResponse(statusCode: number, timestampMs = Date.now()): void {
    if (!this.enabled) {
      return;
    }

    const bucket = this.getOrCreateBucket(timestampMs);
    bucket.totalRequests += 1;
    if (statusCode >= 500) {
      bucket.serverErrors += 1;
    }
    this.pruneOldBuckets(timestampMs);
  }

  observeOtpDeliveryFailure(timestampMs = Date.now()): void {
    if (!this.enabled) {
      return;
    }

    const bucket = this.getOrCreateBucket(timestampMs);
    bucket.otpDeliveryFailures += 1;
    this.pruneOldBuckets(timestampMs);
  }

  async evaluate(nowMs = Date.now()): Promise<void> {
    if (!this.enabled) {
      return;
    }

    this.pruneOldBuckets(nowMs);
    const totals = this.getWindowTotals(nowMs);

    if (totals.totalRequests >= this.http5xxMinRequests) {
      const errorRatePercent = (totals.serverErrors / totals.totalRequests) * 100;

      if (errorRatePercent >= this.http5xxRateThresholdPercent) {
        await this.alertsService.notify({
          severity: "critical",
          title: "SLO breach: HTTP 5xx error rate",
          message: `HTTP 5xx error rate reached ${errorRatePercent.toFixed(2)}% in the active SLO window.`,
          fingerprint: "slo:http_5xx_rate",
          metadata: {
            windowSeconds: Math.round(this.windowMs / 1000),
            totalRequests: totals.totalRequests,
            serverErrors: totals.serverErrors,
            errorRatePercent: Number(errorRatePercent.toFixed(2)),
            thresholdPercent: this.http5xxRateThresholdPercent
          }
        });
      }
    }

    if (totals.otpDeliveryFailures >= this.otpDeliveryFailureThreshold) {
      await this.alertsService.notify({
        severity: "critical",
        title: "SLO breach: OTP delivery failures",
        message: `OTP delivery failures reached ${totals.otpDeliveryFailures} in the active SLO window.`,
        fingerprint: "slo:otp_delivery_failures",
        metadata: {
          windowSeconds: Math.round(this.windowMs / 1000),
          otpDeliveryFailures: totals.otpDeliveryFailures,
          threshold: this.otpDeliveryFailureThreshold
        }
      });
    }
  }

  start(): void {
    if (!this.enabled || this.evaluationInterval) {
      return;
    }

    this.evaluationInterval = setInterval(() => {
      void this.evaluate().catch((error) => {
        this.logger.warn({ err: error }, "SLO monitor evaluation failed.");
      });
    }, this.evaluationIntervalMs);

    if (typeof (this.evaluationInterval as { unref?: () => void }).unref === "function") {
      (this.evaluationInterval as { unref: () => void }).unref();
    }
  }

  stop(): void {
    if (!this.evaluationInterval) {
      return;
    }

    clearInterval(this.evaluationInterval);
    this.evaluationInterval = null;
  }
}
