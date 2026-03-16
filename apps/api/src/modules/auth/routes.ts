import { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppContext } from "../../context.js";
import { parseOrThrow } from "../../utils/validation.js";
import { requireAuth } from "../../utils/auth.js";

const requestOtpSchema = z.object({
  email: z.string().trim().email().max(320)
});

const googleOAuthSchema = z.object({
  idToken: z.string().min(1).max(4096),
  nonce: z.string().max(128).optional()
});

const appleOAuthSchema = z.object({
  identityToken: z.string().min(1).max(4096),
  rawNonce: z.string().min(8).max(128),
  user: z
    .object({
      firstName: z.string().max(80).optional(),
      lastName: z.string().max(80).optional(),
      email: z.string().email().max(320).optional()
    })
    .optional()
});

const verifyOtpSchema = z.object({
  email: z.string().trim().email().max(320),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/)
});

export const registerAuthRoutes = async (app: FastifyInstance, ctx: AppContext): Promise<void> => {
  app.post("/api/v1/auth/request-otp", async (request) => {
    const body = parseOrThrow(requestOtpSchema, request.body);

    return ctx.authService.requestOtp({
      email: body.email,
      ipAddress: request.ip,
      requestId: request.id
    });
  });

  app.post("/api/v1/auth/verify-otp", async (request) => {
    const body = parseOrThrow(verifyOtpSchema, request.body);

    const result = await ctx.authService.verifyOtp({
      email: body.email,
      code: body.code,
      ipAddress: request.ip,
      requestId: request.id
    });

    return {
      token: result.token,
      user: result.user,
      session: {
        expiresInDays: ctx.env.AUTH_SESSION_TTL_DAYS
      }
    };
  });

  app.post("/api/v1/auth/recovery/request-otp", async (request) => {
    const body = parseOrThrow(requestOtpSchema, request.body);

    return ctx.authService.requestOtp({
      email: body.email,
      ipAddress: request.ip,
      requestId: request.id
    });
  });

  app.post("/api/v1/auth/recovery/verify-otp", async (request) => {
    const body = parseOrThrow(verifyOtpSchema, request.body);

    const result = await ctx.authService.verifyOtp({
      email: body.email,
      code: body.code,
      ipAddress: request.ip,
      requestId: request.id
    });

    return {
      token: result.token,
      user: result.user,
      session: {
        expiresInDays: ctx.env.AUTH_SESSION_TTL_DAYS
      }
    };
  });

  app.post("/api/v1/auth/logout", async (request) => {
    const identity = requireAuth(request);
    await ctx.authService.logout(identity, request.id, request.ip);
    return { success: true };
  });

  app.get("/api/v1/me", async (request) => {
    const identity = requireAuth(request);
    return {
      id: identity.userId,
      email: identity.email
    };
  });

  app.delete("/api/v1/account", async (request) => {
    const identity = requireAuth(request);
    await ctx.authService.deleteAccount(identity, request.id, request.ip);
    return { success: true };
  });

  app.post("/api/v1/auth/oauth/google", async (request) => {
    const body = parseOrThrow(googleOAuthSchema, request.body);

    const result = await ctx.authService.signInWithOAuth({
      provider: "google",
      idToken: body.idToken,
      rawNonce: body.nonce,
      ipAddress: request.ip,
      requestId: request.id
    });

    return {
      token: result.token,
      user: result.user,
      session: { expiresInDays: ctx.env.AUTH_SESSION_TTL_DAYS }
    };
  });

  app.post("/api/v1/auth/oauth/apple", async (request) => {
    const body = parseOrThrow(appleOAuthSchema, request.body);

    const result = await ctx.authService.signInWithOAuth({
      provider: "apple",
      idToken: body.identityToken,
      rawNonce: body.rawNonce,
      profileHint: body.user,
      ipAddress: request.ip,
      requestId: request.id
    });

    return {
      token: result.token,
      user: result.user,
      session: { expiresInDays: ctx.env.AUTH_SESSION_TTL_DAYS }
    };
  });
};
