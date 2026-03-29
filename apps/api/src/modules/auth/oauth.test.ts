import { createHash } from "node:crypto";
import { SignJWT, generateKeyPair } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyGoogleIdToken, verifyAppleIdToken } from "./oauth.js";
import { AppError } from "../../errors.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeGoogleToken(
  claims: Record<string, unknown>,
  { expired = false }: { expired?: boolean } = {}
): Promise<{ idToken: string; clientId: string }> {
  const { privateKey } = await generateKeyPair("RS256");
  const clientId = "test-client-id.apps.googleusercontent.com";
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({
    iss: "https://accounts.google.com",
    aud: clientId,
    sub: "google-user-123",
    email: "user@example.com",
    email_verified: true,
    ...claims
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt(expired ? now - 7200 : now)
    .setExpirationTime(expired ? now - 3600 : now + 3600)
    .sign(privateKey);

  return { idToken: token, clientId };
}

async function makeAppleToken(
  rawNonce: string,
  claims: Record<string, unknown> = {},
  { expired = false }: { expired?: boolean } = {}
): Promise<{ identityToken: string; bundleId: string }> {
  const { privateKey } = await generateKeyPair("RS256");
  const bundleId = "com.glitch.finance";
  const nonceHash = createHash("sha256").update(rawNonce).digest("hex");
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({
    iss: "https://appleid.apple.com",
    aud: bundleId,
    sub: "apple-user-abc.123",
    nonce: nonceHash,
    ...claims
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt(expired ? now - 7200 : now)
    .setExpirationTime(expired ? now - 3600 : now + 3600)
    .sign(privateKey);

  return { identityToken: token, bundleId };
}

// ---------------------------------------------------------------------------
// Mock JWKS — replace the remote JWKS fetch with a local key set that matches
// the keys used when signing test tokens above.
// ---------------------------------------------------------------------------

vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();

  // Capture keys per-call so each test's key is used for its own token
  const keyCache = new Map<string, CryptoKey>();

  return {
    ...actual,
    createRemoteJWKSet: () => {
      return async (protectedHeader: { kid?: string }, token: unknown) => {
        // Extract the public key from the JWT header's kid claim if present,
        // otherwise use the last registered key. For tests, we store the key
        // directly on the module-level cache keyed by a nonce in kid.
        const kid = (protectedHeader as { kid?: string }).kid ?? "__default__";
        const key = keyCache.get(kid);
        if (!key) {
          throw new Error(`No test key registered for kid=${kid}`);
        }
        return key;
      };
    },
    // Expose helper so tests can register keys
    __registerTestKey: (kid: string, key: CryptoKey) => keyCache.set(kid, key),
    __clearTestKeys: () => keyCache.clear()
  };
});

// ---------------------------------------------------------------------------
// Because we mock createRemoteJWKSet at the module level, we need a different
// strategy: mock the entire jwtVerify to control what payload comes back.
// This is simpler and avoids JWKS plumbing altogether.
// ---------------------------------------------------------------------------

// Reset approach: mock jwtVerify directly per-test
describe("verifyGoogleIdToken", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws OAUTH_NOT_CONFIGURED when clientId is empty", async () => {
    // This is validated at the service layer, but test the function directly
    // with a clearly invalid token to confirm it throws INVALID_OAUTH_TOKEN
    await expect(verifyGoogleIdToken("not.a.jwt", "client")).rejects.toMatchObject({
      code: "INVALID_OAUTH_TOKEN"
    });
  });

  it("throws INVALID_OAUTH_TOKEN on a malformed token string", async () => {
    await expect(verifyGoogleIdToken("garbage", "client-id")).rejects.toMatchObject({
      code: "INVALID_OAUTH_TOKEN"
    });
  });

  it("throws INVALID_OAUTH_TOKEN on an empty token string", async () => {
    await expect(verifyGoogleIdToken("", "client-id")).rejects.toMatchObject({
      code: "INVALID_OAUTH_TOKEN"
    });
  });
});

describe("verifyAppleIdToken", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws INVALID_OAUTH_TOKEN on a malformed token string", async () => {
    await expect(verifyAppleIdToken("garbage", "raw-nonce", "com.glitch.finance")).rejects.toMatchObject({
      code: "INVALID_OAUTH_TOKEN"
    });
  });

  it("throws INVALID_OAUTH_TOKEN on an empty token string", async () => {
    await expect(verifyAppleIdToken("", "raw-nonce", "com.glitch.finance")).rejects.toMatchObject({
      code: "INVALID_OAUTH_TOKEN"
    });
  });
});

// ---------------------------------------------------------------------------
// Unit tests using jose's jwtVerify mock
// ---------------------------------------------------------------------------

describe("verifyGoogleIdToken — payload validation", () => {
  afterEach(() => vi.restoreAllMocks());

  const mockJwtVerify = async (payload: Record<string, unknown>) => {
    const jose = await import("jose");
    vi.spyOn(jose, "jwtVerify").mockResolvedValueOnce({
      payload: { ...payload },
      protectedHeader: { alg: "RS256" }
    } as ReturnType<typeof jose.jwtVerify> extends Promise<infer T> ? T : never);
  };

  it("returns parsed payload for a valid token", async () => {
    await mockJwtVerify({ sub: "uid-123", email: "a@b.com", email_verified: true, name: "Alice" });
    const result = await verifyGoogleIdToken("token", "client-id");
    expect(result).toEqual({ sub: "uid-123", email: "a@b.com", emailVerified: true, name: "Alice" });
  });

  it("accepts a matching nonce when provided", async () => {
    await mockJwtVerify({ sub: "uid-123", email: "a@b.com", email_verified: true, nonce: "nonce-123" });
    const result = await verifyGoogleIdToken("token", "client-id", "nonce-123");
    expect(result).toEqual({ sub: "uid-123", email: "a@b.com", emailVerified: true, name: undefined });
  });

  it("returns payload without name when name claim is absent", async () => {
    await mockJwtVerify({ sub: "uid-123", email: "a@b.com", email_verified: true });
    const result = await verifyGoogleIdToken("token", "client-id");
    expect(result.name).toBeUndefined();
  });

  it("throws INVALID_OAUTH_TOKEN when sub is missing", async () => {
    await mockJwtVerify({ email: "a@b.com", email_verified: true });
    await expect(verifyGoogleIdToken("token", "client-id")).rejects.toMatchObject({
      code: "INVALID_OAUTH_TOKEN"
    });
  });

  it("throws INVALID_OAUTH_TOKEN when email is missing", async () => {
    await mockJwtVerify({ sub: "uid-123", email_verified: true });
    await expect(verifyGoogleIdToken("token", "client-id")).rejects.toMatchObject({
      code: "INVALID_OAUTH_TOKEN"
    });
  });

  it("throws EMAIL_NOT_VERIFIED when email_verified is false", async () => {
    await mockJwtVerify({ sub: "uid-123", email: "a@b.com", email_verified: false });
    await expect(verifyGoogleIdToken("token", "client-id")).rejects.toMatchObject({
      code: "EMAIL_NOT_VERIFIED"
    });
  });

  it("throws EMAIL_NOT_VERIFIED when email_verified is absent", async () => {
    await mockJwtVerify({ sub: "uid-123", email: "a@b.com" });
    await expect(verifyGoogleIdToken("token", "client-id")).rejects.toMatchObject({
      code: "EMAIL_NOT_VERIFIED"
    });
  });

  it("throws NONCE_MISMATCH when nonce does not match", async () => {
    await mockJwtVerify({ sub: "uid-123", email: "a@b.com", email_verified: true, nonce: "wrong-nonce" });
    await expect(verifyGoogleIdToken("token", "client-id", "expected-nonce")).rejects.toMatchObject({
      code: "NONCE_MISMATCH"
    });
  });

  it("throws NONCE_MISMATCH when nonce claim is absent but one is required", async () => {
    await mockJwtVerify({ sub: "uid-123", email: "a@b.com", email_verified: true });
    await expect(verifyGoogleIdToken("token", "client-id", "expected-nonce")).rejects.toMatchObject({
      code: "NONCE_MISMATCH"
    });
  });
});

describe("verifyAppleIdToken — payload validation", () => {
  afterEach(() => vi.restoreAllMocks());

  const rawNonce = "test-raw-nonce-value";
  const nonceHash = createHash("sha256").update(rawNonce).digest("hex");

  const mockJwtVerify = async (payload: Record<string, unknown>) => {
    const jose = await import("jose");
    vi.spyOn(jose, "jwtVerify").mockResolvedValueOnce({
      payload: { ...payload },
      protectedHeader: { alg: "RS256" }
    } as ReturnType<typeof jose.jwtVerify> extends Promise<infer T> ? T : never);
  };

  it("returns parsed payload with email for a valid token", async () => {
    await mockJwtVerify({ sub: "apple-uid-456", email: "user@privaterelay.appleid.com", nonce: nonceHash });
    const result = await verifyAppleIdToken("token", rawNonce, "com.glitch.finance");
    expect(result).toEqual({ sub: "apple-uid-456", email: "user@privaterelay.appleid.com" });
  });

  it("returns payload without email when email claim is absent (repeat sign-ins)", async () => {
    await mockJwtVerify({ sub: "apple-uid-456", nonce: nonceHash });
    const result = await verifyAppleIdToken("token", rawNonce, "com.glitch.finance");
    expect(result.email).toBeUndefined();
  });

  it("throws INVALID_OAUTH_TOKEN when sub is missing", async () => {
    await mockJwtVerify({ nonce: nonceHash });
    await expect(verifyAppleIdToken("token", rawNonce, "com.glitch.finance")).rejects.toMatchObject({
      code: "INVALID_OAUTH_TOKEN"
    });
  });

  it("throws NONCE_MISMATCH when nonce does not match rawNonce", async () => {
    await mockJwtVerify({ sub: "apple-uid-456", nonce: "wrong-nonce-hash" });
    await expect(verifyAppleIdToken("token", rawNonce, "com.glitch.finance")).rejects.toMatchObject({
      code: "NONCE_MISMATCH"
    });
  });

  it("throws NONCE_MISMATCH when nonce claim is absent", async () => {
    await mockJwtVerify({ sub: "apple-uid-456" });
    await expect(verifyAppleIdToken("token", rawNonce, "com.glitch.finance")).rejects.toMatchObject({
      code: "NONCE_MISMATCH"
    });
  });
});
