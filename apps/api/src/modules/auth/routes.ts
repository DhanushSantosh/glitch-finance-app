import { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppContext } from "../../context.js";
import { AppError } from "../../errors.js";
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
  audience: z.enum(["app", "service"]).optional(),
  user: z
    .object({
      firstName: z.string().max(80).optional(),
      lastName: z.string().max(80).optional(),
      email: z.string().email().max(320).optional()
    })
    .optional()
});

const appleCallbackBodySchema = z.object({
  state: z.string().min(1).max(2048),
  id_token: z.string().min(1).max(4096).optional(),
  user: z.string().max(4096).optional(),
  error: z.string().max(128).optional(),
  error_description: z.string().max(512).optional()
});

const appleCallbackStateSchema = z.object({
  clientState: z.string().min(1).max(256),
  rawNonce: z.string().min(8).max(128),
  redirectUri: z.string().url().max(2048)
});

const appleUserHintSchema = z
  .object({
    name: z
      .object({
        firstName: z.string().max(80).optional(),
        lastName: z.string().max(80).optional()
      })
      .optional(),
    email: z.string().email().max(320).optional()
  })
  .transform((value) => ({
    firstName: value.name?.firstName,
    lastName: value.name?.lastName,
    email: value.email
  }));

const isSupportedMobileRedirectUri = (value: string): boolean =>
  value.startsWith("velqora://") || value.startsWith("exp://") || value.startsWith("exps://");

const parseJsonValue = <T>(value: string, label: string): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new AppError(400, "INVALID_OAUTH_CALLBACK", `Apple Sign-In callback contained invalid ${label}.`);
  }
};

const verifyOtpSchema = z.object({
  email: z.string().trim().email().max(320),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/)
});

export const registerAuthRoutes = async (app: FastifyInstance, ctx: AppContext): Promise<void> => {
  app.post("/api/v1/auth/request-otp", { config: { rateLimit: { max: 5, timeWindow: "15 minutes" } } }, async (request) => {
    const body = parseOrThrow(requestOtpSchema, request.body);

    return ctx.authService.requestOtp({
      email: body.email,
      ipAddress: request.ip,
      requestId: request.id
    });
  });

  app.post("/api/v1/auth/verify-otp", { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } }, async (request) => {
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

  app.post("/api/v1/auth/recovery/request-otp", { config: { rateLimit: { max: 5, timeWindow: "15 minutes" } } }, async (request) => {
    const body = parseOrThrow(requestOtpSchema, request.body);

    return ctx.authService.requestOtp({
      email: body.email,
      ipAddress: request.ip,
      requestId: request.id
    });
  });

  app.post("/api/v1/auth/recovery/verify-otp", { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } }, async (request) => {
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

  app.delete("/api/v1/account", { config: { rateLimit: { max: 5, timeWindow: "15 minutes" } } }, async (request) => {
    const identity = requireAuth(request);
    await ctx.authService.deleteAccount(identity, request.id, request.ip);
    return { success: true };
  });

  app.post("/api/v1/auth/oauth/google", { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } }, async (request) => {
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

  app.post("/api/v1/auth/oauth/apple", { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } }, async (request) => {
    const body = parseOrThrow(appleOAuthSchema, request.body);

    const result = await ctx.authService.signInWithOAuth({
      provider: "apple",
      idToken: body.identityToken,
      rawNonce: body.rawNonce,
      audience: body.audience,
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

  app.post("/api/v1/auth/oauth/apple/callback", async (request, reply) => {
    const body = parseOrThrow(appleCallbackBodySchema, request.body);
    const callbackState = parseOrThrow(appleCallbackStateSchema, parseJsonValue(body.state, "state"));

    if (!isSupportedMobileRedirectUri(callbackState.redirectUri)) {
      throw new AppError(400, "INVALID_OAUTH_CALLBACK", "Apple Sign-In callback redirect URI is not allowed.");
    }

    const redirectUrl = new URL(callbackState.redirectUri);
    redirectUrl.searchParams.set("state", callbackState.clientState);

    if (body.error) {
      redirectUrl.searchParams.set("error", body.error);
      if (body.error_description) {
        redirectUrl.searchParams.set("errorDescription", body.error_description);
      }
      return reply.redirect(redirectUrl.toString(), 303);
    }

    if (!body.id_token) {
      redirectUrl.searchParams.set("error", "missing_identity_token");
      redirectUrl.searchParams.set("errorDescription", "Apple Sign-In did not return an identity token.");
      return reply.redirect(redirectUrl.toString(), 303);
    }

    redirectUrl.searchParams.set("identityToken", body.id_token);
    redirectUrl.searchParams.set("rawNonce", callbackState.rawNonce);

    if (body.user) {
      const user = parseOrThrow(appleUserHintSchema, parseJsonValue(body.user, "user payload"));
      if (user.firstName || user.lastName || user.email) {
        redirectUrl.searchParams.set("user", JSON.stringify(user));
      }
    }

    return reply.redirect(redirectUrl.toString(), 303);
  });
};
