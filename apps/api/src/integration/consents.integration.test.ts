import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";

type AuthResult = {
  token: string;
  userId: string;
};

const authViaOtp = async (app: FastifyInstance, email: string): Promise<AuthResult> => {
  const requestOtpResponse = await app.inject({
    method: "POST",
    url: "/api/v1/auth/request-otp",
    payload: { email }
  });

  expect(requestOtpResponse.statusCode).toBe(200);
  const requestOtpJson = requestOtpResponse.json() as { debugOtpCode?: string };
  expect(requestOtpJson.debugOtpCode).toBeTruthy();

  const verifyResponse = await app.inject({
    method: "POST",
    url: "/api/v1/auth/verify-otp",
    payload: { email, code: requestOtpJson.debugOtpCode }
  });

  expect(verifyResponse.statusCode).toBe(200);
  const verifyJson = verifyResponse.json() as { token: string; user: { id: string } };

  return {
    token: verifyJson.token,
    userId: verifyJson.user.id
  };
};

describe("consents integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/consents/sms-import
  // -------------------------------------------------------------------------

  it("GET /api/v1/consents/sms-import returns 401 when unauthenticated", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/consents/sms-import"
    });

    expect(response.statusCode).toBe(401);
    const errorJson = response.json() as { error: { code: string } };
    expect(errorJson.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/v1/consents/sms-import returns enabled: false by default for a new user", async () => {
    const auth = await authViaOtp(app, `consent-get-default-${randomUUID()}@example.com`);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/consents/sms-import",
      headers: { authorization: `Bearer ${auth.token}` }
    });

    expect(response.statusCode).toBe(200);
    const json = response.json() as {
      consentKey: string;
      enabled: boolean;
      featureAvailable: boolean;
      capturedAt: string | null;
      legalTextVersion: string;
    };

    expect(json.consentKey).toBe("sms_import");
    expect(json.enabled).toBe(false);
    expect(json.featureAvailable).toBe(false);
    expect(json.capturedAt).toBeNull();
    expect(typeof json.legalTextVersion).toBe("string");
  });

  it("GET /api/v1/consents/sms-import returns the current consent state after an intent is logged", async () => {
    const auth = await authViaOtp(app, `consent-get-after-intent-${randomUUID()}@example.com`);

    // Log an intent first
    const intentResponse = await app.inject({
      method: "POST",
      url: "/api/v1/consents/sms-import-intent",
      headers: {
        authorization: `Bearer ${auth.token}`,
        "idempotency-key": randomUUID()
      },
      payload: { enabled: true }
    });
    expect(intentResponse.statusCode).toBe(200);

    // Now fetch the consent state — should reflect the record was created
    const getResponse = await app.inject({
      method: "GET",
      url: "/api/v1/consents/sms-import",
      headers: { authorization: `Bearer ${auth.token}` }
    });

    expect(getResponse.statusCode).toBe(200);
    const json = getResponse.json() as {
      consentKey: string;
      enabled: boolean;
      featureAvailable: boolean;
      capturedAt: string | null;
    };

    expect(json.consentKey).toBe("sms_import");
    // Feature is locked off — enabled stays false even if user requested true
    expect(json.enabled).toBe(false);
    expect(json.featureAvailable).toBe(false);
    // capturedAt should now be set
    expect(json.capturedAt).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // POST /api/v1/consents/sms-import-intent
  // -------------------------------------------------------------------------

  it("POST /api/v1/consents/sms-import-intent returns 401 when unauthenticated", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/consents/sms-import-intent",
      payload: { enabled: true }
    });

    expect(response.statusCode).toBe(401);
    const errorJson = response.json() as { error: { code: string } };
    expect(errorJson.error.code).toBe("UNAUTHORIZED");
  });

  it("POST /api/v1/consents/sms-import-intent with enabled: true logs intent and returns acknowledged response", async () => {
    const auth = await authViaOtp(app, `consent-intent-true-${randomUUID()}@example.com`);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/consents/sms-import-intent",
      headers: {
        authorization: `Bearer ${auth.token}`,
        "idempotency-key": randomUUID()
      },
      payload: { enabled: true }
    });

    expect(response.statusCode).toBe(200);
    const json = response.json() as {
      acknowledged: boolean;
      featureAvailable: boolean;
      enabled: boolean;
      requestedEnabled: boolean;
      legalTextVersion: string;
    };

    expect(json.acknowledged).toBe(true);
    expect(json.featureAvailable).toBe(false);
    // Feature locked off — enabled is always false regardless of requestedEnabled
    expect(json.enabled).toBe(false);
    expect(json.requestedEnabled).toBe(true);
    expect(typeof json.legalTextVersion).toBe("string");
  });

  it("POST /api/v1/consents/sms-import-intent with enabled: false also logs intent", async () => {
    const auth = await authViaOtp(app, `consent-intent-false-${randomUUID()}@example.com`);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/consents/sms-import-intent",
      headers: {
        authorization: `Bearer ${auth.token}`,
        "idempotency-key": randomUUID()
      },
      payload: { enabled: false }
    });

    expect(response.statusCode).toBe(200);
    const json = response.json() as {
      acknowledged: boolean;
      requestedEnabled: boolean;
    };

    expect(json.acknowledged).toBe(true);
    expect(json.requestedEnabled).toBe(false);
  });

  it("POST /api/v1/consents/sms-import-intent returns 400 when enabled field is missing", async () => {
    const auth = await authViaOtp(app, `consent-intent-missing-${randomUUID()}@example.com`);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/consents/sms-import-intent",
      headers: {
        authorization: `Bearer ${auth.token}`,
        "idempotency-key": randomUUID()
      },
      payload: {}
    });

    expect(response.statusCode).toBe(400);
  });

  it("POST /api/v1/consents/sms-import-intent is idempotent for the same idempotency-key", async () => {
    const auth = await authViaOtp(app, `consent-intent-idem-${randomUUID()}@example.com`);
    const idempotencyKey = randomUUID();

    const firstResponse = await app.inject({
      method: "POST",
      url: "/api/v1/consents/sms-import-intent",
      headers: {
        authorization: `Bearer ${auth.token}`,
        "idempotency-key": idempotencyKey
      },
      payload: { enabled: true }
    });
    expect(firstResponse.statusCode).toBe(200);

    // Second request with the same idempotency key — should replay the first result
    const secondResponse = await app.inject({
      method: "POST",
      url: "/api/v1/consents/sms-import-intent",
      headers: {
        authorization: `Bearer ${auth.token}`,
        "idempotency-key": idempotencyKey
      },
      payload: { enabled: true }
    });
    expect(secondResponse.statusCode).toBe(200);

    // Both responses should be identical
    expect(secondResponse.json()).toEqual(firstResponse.json());
  });

  it("consent state is user-isolated — one user's intent does not affect another user", async () => {
    const userA = await authViaOtp(app, `consent-isolation-a-${randomUUID()}@example.com`);
    const userB = await authViaOtp(app, `consent-isolation-b-${randomUUID()}@example.com`);

    // User A logs an intent
    await app.inject({
      method: "POST",
      url: "/api/v1/consents/sms-import-intent",
      headers: {
        authorization: `Bearer ${userA.token}`,
        "idempotency-key": randomUUID()
      },
      payload: { enabled: true }
    });

    // User B should still see no capturedAt (no record in their scope)
    const userBConsent = await app.inject({
      method: "GET",
      url: "/api/v1/consents/sms-import",
      headers: { authorization: `Bearer ${userB.token}` }
    });
    expect(userBConsent.statusCode).toBe(200);
    const userBJson = userBConsent.json() as { capturedAt: string | null };
    expect(userBJson.capturedAt).toBeNull();
  });
});
