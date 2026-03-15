import type { FastifyBaseLogger } from "fastify";

export type AlertSeverity = "warning" | "error" | "critical";

type AlertsServiceOptions = {
  logger: FastifyBaseLogger;
  enabled: boolean;
  webhookUrl?: string;
  cooldownMs: number;
  serviceName: string;
  environment: string;
};

type AlertInput = {
  severity: AlertSeverity;
  title: string;
  message: string;
  fingerprint?: string;
  metadata?: Record<string, unknown>;
};

type AlertPayload = {
  service: string;
  environment: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  fingerprint: string;
  metadata: Record<string, unknown>;
  emittedAt: string;
};

const ALERT_REQUEST_TIMEOUT_MS = 3000;
const ALERT_MAP_MAX_SIZE = 500;

export class AlertsService {
  private readonly logger: FastifyBaseLogger;
  private readonly enabled: boolean;
  private readonly webhookUrl?: string;
  private readonly cooldownMs: number;
  private readonly serviceName: string;
  private readonly environment: string;
  private readonly recentFingerprints = new Map<string, number>();

  constructor(options: AlertsServiceOptions) {
    this.logger = options.logger;
    this.enabled = options.enabled;
    this.webhookUrl = options.webhookUrl;
    this.cooldownMs = options.cooldownMs;
    this.serviceName = options.serviceName;
    this.environment = options.environment;
  }

  private createFingerprint(input: AlertInput): string {
    return input.fingerprint ?? `${input.severity}:${input.title}:${input.message}`;
  }

  private cleanupOldFingerprints(nowMs: number): void {
    for (const [fingerprint, lastSentAt] of this.recentFingerprints.entries()) {
      if (nowMs - lastSentAt > this.cooldownMs) {
        this.recentFingerprints.delete(fingerprint);
      }
    }

    if (this.recentFingerprints.size <= ALERT_MAP_MAX_SIZE) {
      return;
    }

    const sorted = Array.from(this.recentFingerprints.entries()).sort((left, right) => left[1] - right[1]);
    const removeCount = sorted.length - ALERT_MAP_MAX_SIZE;
    for (let index = 0; index < removeCount; index += 1) {
      this.recentFingerprints.delete(sorted[index][0]);
    }
  }

  private shouldSkipDueToCooldown(fingerprint: string, nowMs: number): boolean {
    this.cleanupOldFingerprints(nowMs);
    const lastSentAt = this.recentFingerprints.get(fingerprint);
    if (lastSentAt !== undefined && nowMs - lastSentAt < this.cooldownMs) {
      return true;
    }
    this.recentFingerprints.set(fingerprint, nowMs);
    return false;
  }

  async notify(input: AlertInput): Promise<void> {
    if (!this.enabled || !this.webhookUrl) {
      return;
    }

    const nowMs = Date.now();
    const fingerprint = this.createFingerprint(input);
    if (this.shouldSkipDueToCooldown(fingerprint, nowMs)) {
      return;
    }

    const payload: AlertPayload = {
      service: this.serviceName,
      environment: this.environment,
      severity: input.severity,
      title: input.title,
      message: input.message,
      fingerprint,
      metadata: input.metadata ?? {},
      emittedAt: new Date(nowMs).toISOString()
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ALERT_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) {
        const responseBody = await response.text();
        this.logger.warn(
          {
            statusCode: response.status,
            responseBody: responseBody.slice(0, 400),
            fingerprint
          },
          "Alert delivery failed with non-success status."
        );
      }
    } catch (error) {
      this.logger.warn({ err: error, fingerprint }, "Alert delivery failed.");
    } finally {
      clearTimeout(timeout);
    }
  }
}
