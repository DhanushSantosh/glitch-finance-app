import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";

const authViaOtp = async (app: FastifyInstance, email: string): Promise<{ token: string }> => {
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
    payload: {
      email,
      code: requestOtpJson.debugOtpCode
    }
  });

  expect(verifyResponse.statusCode).toBe(200);
  const verifyJson = verifyResponse.json() as { token: string };
  return { token: verifyJson.token };
};

describe("imports integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("keeps sms scan disabled by default", async () => {
    const user = await authViaOtp(app, `imports-${randomUUID()}@example.com`);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/imports/sms/scan",
      headers: {
        authorization: `Bearer ${user.token}`
      },
      payload: {
        messages: [
          {
            messageId: "message-1",
            body: "Rs 999 debited from your account to UPI SWIGGY. Ref UTR123."
          }
        ]
      }
    });

    expect(response.statusCode).toBe(409);
    const json = response.json() as {
      error: { code: string; message: string };
    };
    expect(json.error.code).toBe("SMS_IMPORT_DISABLED");
  });
});
