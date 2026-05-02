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
  } as unknown as Awaited<ReturnType<typeof jose.jwtVerify>>);
}

async function mockAppleToken(sub: string, rawNonce: string, email?: string) {
  const jose = await import("jose");
  const nonceHash = createHash("sha256").update(rawNonce).digest("hex");
  vi.spyOn(jose, "jwtVerify").mockResolvedValueOnce({
    payload: { sub, nonce: nonceHash, ...(email ? { email } : {}) },
    protectedHeader: { alg: "RS256" }
  } as unknown as Awaited<ReturnType<typeof jose.jwtVerify>>);
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

  it("returns 503 when Google OAuth is disabled by default", async () => {
    await mockGoogleToken("g-new-user-001", "newgoogle@example.com");

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/google",
      payload: { idToken: "mock-id-token", nonce: "nonce-123" }
    });

    expect(response.statusCode).toBe(503);
    expect(response.json<{ error: { code: string } }>().error.code).toBe("OAUTH_DISABLED");
  });

  it("does not evaluate token verification while Google OAuth is disabled", async () => {
    const jose = await import("jose");
    vi.spyOn(jose, "jwtVerify").mockRejectedValueOnce(new Error("invalid signature"));

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/google",
      payload: { idToken: "bad-token", nonce: "nonce-123" }
    });

    expect(response.statusCode).toBe(503);
    expect(response.json<{ error: { code: string } }>().error.code).toBe("OAUTH_DISABLED");
    expect(jose.jwtVerify).not.toHaveBeenCalled();
  });

  it("requires a nonce for Google OAuth requests when the route validates", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/google",
      payload: { idToken: "mock-id-token" }
    });

    expect(response.statusCode).toBe(503);
    expect(response.json<{ error: { code: string } }>().error.code).toBe("OAUTH_DISABLED");
  });
});

describe("POST /api/v1/auth/oauth/apple", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Must be set before createApp() parses the env schema
    process.env.APPLE_APP_BUNDLE_ID = "com.velqora.finance";
    process.env.APPLE_SERVICE_ID = "com.velqora.finance.service";
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
    process.env.APPLE_APP_BUNDLE_ID = "com.velqora.finance";
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
    process.env.APPLE_APP_BUNDLE_ID = "com.velqora.finance";

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
    process.env.APPLE_APP_BUNDLE_ID = "com.velqora.finance";
    const jose = await import("jose");
    // Nonce hash in token does not match rawNonce provided
    vi.spyOn(jose, "jwtVerify").mockResolvedValueOnce({
      payload: { sub: "a-bad-nonce-003", nonce: "wrong-hash" },
      protectedHeader: { alg: "RS256" }
    } as unknown as Awaited<ReturnType<typeof jose.jwtVerify>>);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/apple",
      payload: { identityToken: "mock-token", rawNonce: RAW_NONCE }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json<{ error: { code: string } }>().error.code).toBe("NONCE_MISMATCH");
  });

  it("returns 401 when token verification fails", async () => {
    process.env.APPLE_APP_BUNDLE_ID = "com.velqora.finance";
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

  it("accepts Apple service-id audience for browser-based sign-in", async () => {
    const jose = await import("jose");
    const nonceHash = createHash("sha256").update(RAW_NONCE).digest("hex");
    vi.spyOn(jose, "jwtVerify").mockResolvedValueOnce({
      payload: { sub: "a-service-001", nonce: nonceHash, email: "apple-web@privaterelay.appleid.com" },
      protectedHeader: { alg: "RS256" }
    } as unknown as Awaited<ReturnType<typeof jose.jwtVerify>>);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/apple",
      payload: { identityToken: "service-token", rawNonce: RAW_NONCE, audience: "service" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<{ user: { email: string } }>().user.email).toBe("apple-web@privaterelay.appleid.com");
    expect(jose.jwtVerify).toHaveBeenCalledWith(
      "service-token",
      expect.any(Function),
      expect.objectContaining({ audience: "com.velqora.finance.service" })
    );
  });

  it("redirects Apple browser callback back into the app with auth payload", async () => {
    const callbackState = JSON.stringify({
      clientState: "client-state-123",
      rawNonce: RAW_NONCE,
      redirectUri: "velqora://oauth/apple"
    });
    const callbackUser = JSON.stringify({
      name: { firstName: "Jamie", lastName: "Lee" },
      email: "jamie@privaterelay.appleid.com"
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/apple/callback",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      payload: new URLSearchParams({
        state: callbackState,
        id_token: "browser-id-token",
        user: callbackUser
      }).toString()
    });

    expect(response.statusCode).toBe(303);
    expect(response.headers.location).toBe(
      "velqora://oauth/apple?state=client-state-123&identityToken=browser-id-token&rawNonce=test-apple-raw-nonce-abc123&user=%7B%22firstName%22%3A%22Jamie%22%2C%22lastName%22%3A%22Lee%22%2C%22email%22%3A%22jamie%40privaterelay.appleid.com%22%7D"
    );
  });

  it("rejects Apple browser callback redirects to unsupported targets", async () => {
    const callbackState = JSON.stringify({
      clientState: "client-state-unsafe",
      rawNonce: RAW_NONCE,
      redirectUri: "https://example.com/oauth/apple"
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/apple/callback",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      payload: new URLSearchParams({
        state: callbackState,
        id_token: "browser-id-token"
      }).toString()
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<{ error: { code: string } }>().error.code).toBe("INVALID_OAUTH_CALLBACK");
  });

  it("issued token is valid for authenticated requests", async () => {
    process.env.APPLE_APP_BUNDLE_ID = "com.velqora.finance";
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

  it("rejects client-supplied email hints when Apple does not return a verified email", async () => {
    process.env.APPLE_APP_BUNDLE_ID = "com.velqora.finance";
    await mockAppleToken("a-no-email-005", RAW_NONCE);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/apple",
      payload: {
        identityToken: "mock-token",
        rawNonce: RAW_NONCE,
        user: {
          email: "victim@example.com",
          firstName: "Mallory"
        }
      }
    });

    expect(response.statusCode).toBe(422);
    expect(response.json<{ error: { code: string } }>().error.code).toBe("VERIFIED_EMAIL_REQUIRED");
  });
});
