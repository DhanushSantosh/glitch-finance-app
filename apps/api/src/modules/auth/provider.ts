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
