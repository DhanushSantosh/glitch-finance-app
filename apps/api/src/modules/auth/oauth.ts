import { createHash } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { AppError } from "../../errors.js";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

export type GoogleTokenPayload = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
};

export type AppleTokenPayload = {
  sub: string;
  email?: string;
};

export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
  expectedNonce?: string
): Promise<GoogleTokenPayload> {
  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: ["accounts.google.com", "https://accounts.google.com"],
      audience: clientId
    });

    if (!payload.sub || typeof payload.sub !== "string") {
      throw new AppError(401, "INVALID_OAUTH_TOKEN", "Google token missing subject claim.");
    }

    if (!payload.email || typeof payload.email !== "string") {
      throw new AppError(401, "INVALID_OAUTH_TOKEN", "Google token missing email claim.");
    }

    if (payload.email_verified !== true) {
      throw new AppError(401, "EMAIL_NOT_VERIFIED", "Google account email is not verified.");
    }

    if (expectedNonce !== undefined) {
      if (typeof payload.nonce !== "string" || payload.nonce !== expectedNonce) {
        throw new AppError(401, "NONCE_MISMATCH", "Google token nonce verification failed.");
      }
    }

    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: true,
      name: typeof payload.name === "string" ? payload.name : undefined
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(401, "INVALID_OAUTH_TOKEN", "Google token verification failed.");
  }
}

export async function verifyAppleIdToken(
  identityToken: string,
  rawNonce: string,
  bundleId: string
): Promise<AppleTokenPayload> {
  try {
    const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
      issuer: "https://appleid.apple.com",
      audience: bundleId
    });

    if (!payload.sub || typeof payload.sub !== "string") {
      throw new AppError(401, "INVALID_OAUTH_TOKEN", "Apple token missing subject claim.");
    }

    // Apple embeds SHA-256 hash of the raw nonce — verify it
    const expectedNonceHash = createHash("sha256").update(rawNonce).digest("hex");
    if (payload.nonce !== expectedNonceHash) {
      throw new AppError(401, "NONCE_MISMATCH", "Apple token nonce verification failed.");
    }

    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(401, "INVALID_OAUTH_TOKEN", "Apple token verification failed.");
  }
}
