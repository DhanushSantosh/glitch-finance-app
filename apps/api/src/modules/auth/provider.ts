import { FastifyBaseLogger } from "fastify";
import { APP_BRAND_NAME, OTP_EMAIL_SUBJECT } from "../../appMetadata.js";

export interface OtpDeliveryProvider {
  sendOtp(email: string, code: string): Promise<void>;
}

const plainEmailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const namedEmailPattern = /^[^<>]+<\s*([^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)\s*>$/;

export const isValidOtpSenderAddress = (value: string): boolean => {
  const normalized = value.trim();
  if (normalized.length < 3) {
    return false;
  }

  if (plainEmailPattern.test(normalized)) {
    return true;
  }

  const match = normalized.match(namedEmailPattern);
  return Boolean(match && plainEmailPattern.test(match[1]));
};

export class ConsoleOtpProvider implements OtpDeliveryProvider {
  constructor(
    private readonly logger: FastifyBaseLogger,
    private readonly options: { exposeDebugOtp: boolean }
  ) {}

  async sendOtp(email: string, code: string): Promise<void> {
    const [localPart = "", domainPart = ""] = email.split("@");
    const maskedEmail =
      localPart.length > 1 ? `${localPart[0]}***${localPart[localPart.length - 1]}@${domainPart}` : `${localPart}***@${domainPart}`;

    this.logger.info(
      {
        email: maskedEmail,
        ...(this.options.exposeDebugOtp ? { code } : {})
      },
      "OTP generated for development delivery channel"
    );
  }
}

type ResendOtpProviderOptions = {
  apiKey: string;
  fromEmail: string;
  requestTimeoutMs: number;
  logger: FastifyBaseLogger;
};

export class ResendOtpProvider implements OtpDeliveryProvider {
  private readonly apiKey: string;
  private readonly fromEmail: string;
  private readonly requestTimeoutMs: number;
  private readonly logger: FastifyBaseLogger;

  constructor(options: ResendOtpProviderOptions) {
    this.apiKey = options.apiKey;
    this.fromEmail = options.fromEmail;
    this.requestTimeoutMs = options.requestTimeoutMs;
    this.logger = options.logger;
  }

  async sendOtp(email: string, code: string): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.requestTimeoutMs);

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: [email],
          subject: OTP_EMAIL_SUBJECT,
          text: `Your verification code is ${code}. It expires in a few minutes.`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
              <p>Your ${APP_BRAND_NAME} verification code is:</p>
              <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 16px 0;">${code}</p>
              <p>This code expires in a few minutes.</p>
              <p>If you did not request this code, you can safely ignore this email.</p>
            </div>
          `
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          {
            statusCode: response.status,
            body: errorBody.slice(0, 400)
          },
          "Failed to send OTP via Resend."
        );
        throw new Error("Failed to send OTP email.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        this.logger.error({ timeoutMs: this.requestTimeoutMs }, "Resend OTP request timed out.");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
