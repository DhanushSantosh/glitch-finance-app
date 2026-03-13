import { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppContext } from "../../context.js";
import { parseOrThrow } from "../../utils/validation.js";
import { requireAuth } from "../../utils/auth.js";

const requestOtpSchema = z.object({
  email: z.string().trim().email().max(320)
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
};
