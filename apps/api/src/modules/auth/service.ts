import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { DbClient } from "../../db/client.js";
import { authOtps, sessions, users } from "../../db/schema.js";
import { AppEnv } from "../../env.js";
import { AppError } from "../../errors.js";
import { RateLimiter } from "../../rate-limit/rate-limiter.js";
import { generateOtpCode, generateSessionToken, hashValue } from "../../utils/crypto.js";
import { AuditService } from "../audit/service.js";
import { OtpDeliveryProvider } from "./provider.js";
import { calculateOtpExpiry, isOtpAttemptAllowed, isOtpExpired } from "./otp-policy.js";

type RequestOtpInput = {
  email: string;
  ipAddress: string;
  requestId: string;
};

type VerifyOtpInput = {
  email: string;
  code: string;
  ipAddress: string;
  requestId: string;
};

export type AuthIdentity = {
  userId: string;
  sessionId: string;
  email: string;
};

type AuthServiceDeps = {
  db: DbClient;
  env: AppEnv;
  rateLimiter: RateLimiter;
  auditService: AuditService;
  otpProvider: OtpDeliveryProvider;
};

export class AuthService {
  constructor(private readonly deps: AuthServiceDeps) {}

  private normalizeEmail(rawEmail: string): string {
    return rawEmail.trim().toLowerCase();
  }

  private hashOtp(email: string, code: string): string {
    return hashValue(`${this.normalizeEmail(email)}:${code}`, this.deps.env.OTP_HASH_SECRET);
  }

  private hashToken(token: string): string {
    return hashValue(token, this.deps.env.OTP_HASH_SECRET);
  }

  async requestOtp(input: RequestOtpInput): Promise<{ message: string; debugOtpCode?: string }> {
    const email = this.normalizeEmail(input.email);
    const window = this.deps.env.AUTH_RATE_LIMIT_WINDOW_SECONDS;

    if (this.deps.env.NODE_ENV !== "test") {
      await this.deps.rateLimiter.consume(
        `rl:auth:request:ip:${input.ipAddress}`,
        this.deps.env.AUTH_RATE_LIMIT_MAX_REQUEST_OTP,
        window
      );
      await this.deps.rateLimiter.consume(
        `rl:auth:request:email:${email}`,
        this.deps.env.AUTH_RATE_LIMIT_MAX_REQUEST_OTP,
        window
      );
    }

    const otpCode = generateOtpCode();
    const codeHash = this.hashOtp(email, otpCode);
    const expiresAt = calculateOtpExpiry(new Date(), this.deps.env.AUTH_OTP_TTL_SECONDS);

    await this.deps.db.insert(authOtps).values({
      email,
      codeHash,
      expiresAt,
      attempts: 0,
      maxAttempts: this.deps.env.AUTH_MAX_OTP_ATTEMPTS,
      requestIp: input.ipAddress
    });

    await this.deps.otpProvider.sendOtp(email, otpCode);

    await this.deps.auditService.log({
      action: "auth.otp_requested",
      entityType: "auth_otp",
      metadata: { email },
      requestId: input.requestId,
      ipAddress: input.ipAddress
    });

    return ctxAwareOtpResponse(this.deps.env.NODE_ENV, otpCode);
  }

  async verifyOtp(input: VerifyOtpInput): Promise<{ token: string; user: { id: string; email: string } }> {
    const email = this.normalizeEmail(input.email);
    const window = this.deps.env.AUTH_RATE_LIMIT_WINDOW_SECONDS;

    if (this.deps.env.NODE_ENV !== "test") {
      await this.deps.rateLimiter.consume(
        `rl:auth:verify:ip:${input.ipAddress}`,
        this.deps.env.AUTH_RATE_LIMIT_MAX_VERIFY_OTP,
        window
      );
      await this.deps.rateLimiter.consume(
        `rl:auth:verify:email:${email}`,
        this.deps.env.AUTH_RATE_LIMIT_MAX_VERIFY_OTP,
        window
      );
    }

    const otpRows = await this.deps.db
      .select()
      .from(authOtps)
      .where(and(eq(authOtps.email, email), isNull(authOtps.usedAt)))
      .orderBy(desc(authOtps.createdAt))
      .limit(1);

    const otpRow = otpRows[0];
    if (!otpRow) {
      throw new AppError(401, "INVALID_OTP", "OTP is invalid or expired.");
    }

    if (isOtpExpired(otpRow.expiresAt, new Date())) {
      throw new AppError(401, "INVALID_OTP", "OTP is invalid or expired.");
    }

    if (!isOtpAttemptAllowed(otpRow.attempts, otpRow.maxAttempts)) {
      throw new AppError(429, "OTP_ATTEMPTS_EXCEEDED", "OTP attempts exceeded. Request a new OTP.");
    }

    const isCodeValid = this.hashOtp(email, input.code) === otpRow.codeHash;

    if (!isCodeValid) {
      await this.deps.db
        .update(authOtps)
        .set({ attempts: sql`${authOtps.attempts} + 1` })
        .where(eq(authOtps.id, otpRow.id));
      throw new AppError(401, "INVALID_OTP", "OTP is invalid or expired.");
    }

    await this.deps.db.update(authOtps).set({ usedAt: new Date() }).where(eq(authOtps.id, otpRow.id));

    const existingUserRows = await this.deps.db.select().from(users).where(eq(users.email, email)).limit(1);
    const user =
      existingUserRows[0] ??
      (
        await this.deps.db
          .insert(users)
          .values({ email })
          .returning({ id: users.id, email: users.email })
      )[0];

    const token = generateSessionToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + this.deps.env.AUTH_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

    const insertedSession = await this.deps.db
      .insert(sessions)
      .values({
        userId: user.id,
        tokenHash,
        expiresAt
      })
      .returning({ id: sessions.id });

    await this.deps.auditService.log({
      userId: user.id,
      action: "auth.login",
      entityType: "session",
      entityId: insertedSession[0].id,
      requestId: input.requestId,
      ipAddress: input.ipAddress
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email
      }
    };
  }

  async resolveAuth(authorizationHeader?: string): Promise<AuthIdentity | null> {
    if (!authorizationHeader) {
      return null;
    }

    const [scheme, token] = authorizationHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
      return null;
    }

    const tokenHash = this.hashToken(token);

    const rows = await this.deps.db
      .select({
        sessionId: sessions.id,
        userId: users.id,
        email: users.email
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
      .limit(1);

    return rows[0] ?? null;
  }

  async logout(identity: AuthIdentity, requestId: string, ipAddress: string): Promise<void> {
    await this.deps.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.id, identity.sessionId), eq(sessions.userId, identity.userId), isNull(sessions.revokedAt)));

    await this.deps.auditService.log({
      userId: identity.userId,
      action: "auth.logout",
      entityType: "session",
      entityId: identity.sessionId,
      requestId,
      ipAddress
    });
  }
}

const ctxAwareOtpResponse = (nodeEnv: AppEnv["NODE_ENV"], otpCode: string): { message: string; debugOtpCode?: string } => {
  if (nodeEnv !== "production") {
    return {
      message: "If this email is valid, an OTP has been sent.",
      debugOtpCode: otpCode
    };
  }

  return {
    message: "If this email is valid, an OTP has been sent."
  };
};
