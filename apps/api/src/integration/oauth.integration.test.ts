import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";

// ---------------------------------------------------------------------------
// Mock jose's jwtVerify globally so we never make real network calls to
// Google or Apple JWKS endpoints during integration tests.
// ---------------------------------------------------------------------------

vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();
  return {
    ...actual,
    createRemoteJWKSet: () => () => Promise.resolve({} as CryptoKey)
  };
});

// ---------------------------------------------------------------------------
// Helpers to produce controlled jwtVerify payloads per-test
// ---------------------------------------------------------------------------

async function mockGoogleToken(sub: string, email: string, emailVerified = true) {
  const jose = await import("jose");
  vi.spyOn(jose, "jwtVerify").mockResolvedValueOnce({
    payload: { sub, email, email_verified: emailVerified, name: "Test User" },
    protectedHeader: { alg: "RS256" }
  } as Awaited<ReturnType<typeof jose.jwtVerify>>);
}

async function mockAppleToken(sub: string, rawNonce: string, email?: string) {
  const jose = await import("jose");
  const nonceHash = createHash("sha256").update(rawNonce).digest("hex");
  vi.spyOn(jose, "jwtVerify").mockResolvedValueOnce({
    payload: { sub, nonce: nonceHash, ...(email ? { email } : {}) },
    protectedHeader: { alg: "RS256" }
  } as Awaited<ReturnType<typeof jose.jwtVerify>>);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/v1/auth/oauth/google", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Must be set before createApp() parses the env schema
    process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });


  it("returns 400 when idToken is missing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/google",
      payload: {}
    });
    expect(response.statusCode).toBe(400);
    expect(response.json<{ error: { code: string } }>().error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when idToken is an empty string", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/google",
      payload: { idToken: "" }
    });
    expect(response.statusCode).toBe(400);
  });

  it("signs up a new user and returns a session token", async () => {
    await mockGoogleToken("g-new-user-001", "newgoogle@example.com");

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/google",
      payload: { idToken: "mock-id-token" }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ token: string; user: { id: string; email: string }; session: { expiresInDays: number } }>();
    expect(typeof body.token).toBe("string");
    expect(body.token.length).toBeGreaterThan(20);
    expect(body.user.email).toBe("newgoogle@example.com");
    expect(body.session.expiresInDays).toBeGreaterThan(0);
  });

  it("returns the same user on a subsequent sign-in with the same Google sub", async () => {
    await mockGoogleToken("g-returning-user-002", "returning@example.com");
    const first = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/google",
      payload: { idToken: "mock-id-token" }
    });
    const firstUserId = first.json<{ user: { id: string } }>().user.id;

    await mockGoogleToken("g-returning-user-002", "returning@example.com");
    const second = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/google",
      payload: { idToken: "mock-id-token" }
    });
    const secondUserId = second.json<{ user: { id: string } }>().user.id;

    expect(firstUserId).toBe(secondUserId);
  });

  it("links Google account to existing OTP user with the same email", async () => {
    const email = "otp-then-google@example.com";

    // Create user via OTP first
    const otpRequest = await app.inject({
      method: "POST",
      url: "/api/v1/auth/request-otp",
      payload: { email }
    });
    const { debugOtpCode } = otpRequest.json<{ debugOtpCode: string }>();
    const otpVerify = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify-otp",
      payload: { email, code: debugOtpCode }
    });
    const otpUserId = otpVerify.json<{ user: { id: string } }>().user.id;

    // Now sign in with Google using the same email
    await mockGoogleToken("g-link-user-003", email);
    const googleResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/google",
      payload: { idToken: "mock-id-token" }
    });

    expect(googleResponse.statusCode).toBe(200);
    const googleUserId = googleResponse.json<{ user: { id: string } }>().user.id;
    expect(googleUserId).toBe(otpUserId);
  });

  it("returns 401 when token verification fails", async () => {
    const jose = await import("jose");
    vi.spyOn(jose, "jwtVerify").mockRejectedValueOnce(new Error("invalid signature"));

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/google",
      payload: { idToken: "bad-token" }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json<{ error: { code: string } }>().error.code).toBe("INVALID_OAUTH_TOKEN");
  });

  it("returns 401 when email is not verified", async () => {
    await mockGoogleToken("g-unverified-004", "unverified@example.com", false);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/google",
      payload: { idToken: "mock-id-token" }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json<{ error: { code: string } }>().error.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("issued token is valid for authenticated requests", async () => {
    await mockGoogleToken("g-auth-check-005", "authcheck@example.com");

    const signIn = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/google",
      payload: { idToken: "mock-id-token" }
    });
    const { token } = signIn.json<{ token: string }>();

    const me = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { authorization: `Bearer ${token}` }
    });

    expect(me.statusCode).toBe(200);
    expect(me.json<{ email: string }>().email).toBe("authcheck@example.com");
  });
});

describe("POST /api/v1/auth/oauth/apple", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Must be set before createApp() parses the env schema
    process.env.APPLE_APP_BUNDLE_ID = "com.glitch.finance";
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  const RAW_NONCE = "test-apple-raw-nonce-abc123";


  it("returns 400 when identityToken is missing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/apple",
      payload: { rawNonce: RAW_NONCE }
    });
    expect(response.statusCode).toBe(400);
    expect(response.json<{ error: { code: string } }>().error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when rawNonce is missing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/apple",
      payload: { identityToken: "token" }
    });
    expect(response.statusCode).toBe(400);
    expect(response.json<{ error: { code: string } }>().error.code).toBe("VALIDATION_ERROR");
  });

  it("signs up a new user with email on first Apple sign-in", async () => {
    process.env.APPLE_APP_BUNDLE_ID = "com.glitch.finance";
    await mockAppleToken("a-new-user-001", RAW_NONCE, "firsttime@privaterelay.appleid.com");

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/apple",
      payload: {
        identityToken: "mock-identity-token",
        rawNonce: RAW_NONCE,
        user: { firstName: "Jane", lastName: "Doe" }
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ token: string; user: { id: string; email: string }; session: { expiresInDays: number } }>();
    expect(typeof body.token).toBe("string");
    expect(body.user.email).toBe("firsttime@privaterelay.appleid.com");
    expect(body.session.expiresInDays).toBeGreaterThan(0);
  });

  it("returns the same user on subsequent sign-in (no email claim on repeat)", async () => {
    process.env.APPLE_APP_BUNDLE_ID = "com.glitch.finance";

    // First sign-in — Apple provides email
    await mockAppleToken("a-returning-002", RAW_NONCE, "apple-returning@privaterelay.appleid.com");
    const first = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/apple",
      payload: { identityToken: "mock-token", rawNonce: RAW_NONCE }
    });
    const firstId = first.json<{ user: { id: string } }>().user.id;

    // Subsequent sign-in — Apple omits email
    await mockAppleToken("a-returning-002", RAW_NONCE);
    const second = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/apple",
      payload: { identityToken: "mock-token", rawNonce: RAW_NONCE }
    });

    expect(second.statusCode).toBe(200);
    expect(second.json<{ user: { id: string } }>().user.id).toBe(firstId);
  });

  it("returns 401 when nonce does not match", async () => {
    process.env.APPLE_APP_BUNDLE_ID = "com.glitch.finance";
    const jose = await import("jose");
    // Nonce hash in token does not match rawNonce provided
    vi.spyOn(jose, "jwtVerify").mockResolvedValueOnce({
      payload: { sub: "a-bad-nonce-003", nonce: "wrong-hash" },
      protectedHeader: { alg: "RS256" }
    } as Awaited<ReturnType<typeof jose.jwtVerify>>);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/apple",
      payload: { identityToken: "mock-token", rawNonce: RAW_NONCE }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json<{ error: { code: string } }>().error.code).toBe("NONCE_MISMATCH");
  });

  it("returns 401 when token verification fails", async () => {
    process.env.APPLE_APP_BUNDLE_ID = "com.glitch.finance";
    const jose = await import("jose");
    vi.spyOn(jose, "jwtVerify").mockRejectedValueOnce(new Error("expired"));

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/apple",
      payload: { identityToken: "bad-token", rawNonce: RAW_NONCE }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json<{ error: { code: string } }>().error.code).toBe("INVALID_OAUTH_TOKEN");
  });

  it("issued token is valid for authenticated requests", async () => {
    process.env.APPLE_APP_BUNDLE_ID = "com.glitch.finance";
    await mockAppleToken("a-auth-check-004", RAW_NONCE, "appleauth@privaterelay.appleid.com");

    const signIn = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/apple",
      payload: { identityToken: "mock-token", rawNonce: RAW_NONCE }
    });
    const { token } = signIn.json<{ token: string }>();

    const me = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { authorization: `Bearer ${token}` }
    });

    expect(me.statusCode).toBe(200);
    expect(me.json<{ email: string }>().email).toBe("appleauth@privaterelay.appleid.com");
  });
});
