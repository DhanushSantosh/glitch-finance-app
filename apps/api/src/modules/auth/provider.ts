import { FastifyBaseLogger } from "fastify";

export interface OtpDeliveryProvider {
  sendOtp(email: string, code: string): Promise<void>;
}

export class ConsoleOtpProvider implements OtpDeliveryProvider {
  constructor(private readonly logger: FastifyBaseLogger) {}

  async sendOtp(email: string, code: string): Promise<void> {
    this.logger.info({ email, code }, "OTP generated for development delivery channel");
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
          subject: "Your Glitch Finance OTP",
          text: `Your verification code is ${code}. It expires in a few minutes.`
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
