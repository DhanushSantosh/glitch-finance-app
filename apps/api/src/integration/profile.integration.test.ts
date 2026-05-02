import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
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
    payload: {
      email,
      code: requestOtpJson.debugOtpCode
    }
  });

  expect(verifyResponse.statusCode).toBe(200);
  const verifyJson = verifyResponse.json() as {
    token: string;
    user: { id: string };
  };

  return {
    token: verifyJson.token,
    userId: verifyJson.user.id
  };
};

const createMultipartAvatarPayload = (fileName: string, mimeType: string, content: Buffer) => {
  const boundary = `----velqora-avatar-${randomUUID()}`;
  const header = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);

  return {
    boundary,
    body: Buffer.concat([header, content, footer])
  };
};

const uploadTestAvatar = async (app: FastifyInstance, token: string) => {
  const pngBytes = Buffer.from([
    0x89, 0x50, 0x4e, 0x47,
    0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52
  ]);
  const multipartPayload = createMultipartAvatarPayload("avatar.png", "image/png", pngBytes);

  return app.inject({
    method: "POST",
    url: "/api/v1/profile/avatar",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": `multipart/form-data; boundary=${multipartPayload.boundary}`
    },
    payload: multipartPayload.body
  });
};

describe("profile integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns default profile values for a newly authenticated user", async () => {
    const auth = await authViaOtp(app, `profile-default-${randomUUID()}@example.com`);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/profile",
      headers: {
        authorization: `Bearer ${auth.token}`
      }
    });

    expect(response.statusCode).toBe(200);
    const json = response.json() as {
      item: {
        id: string;
        email: string;
        firstName: string | null;
        settings: {
          pushNotificationsEnabled: boolean;
          emailNotificationsEnabled: boolean;
          weeklySummaryEnabled: boolean;
          biometricsEnabled: boolean;
          marketingOptIn: boolean;
        };
      };
    };

    expect(json.item.id).toBe(auth.userId);
    expect(json.item.email).toContain("profile-default-");
    expect(json.item.firstName).toBeNull();
    expect(json.item.settings.pushNotificationsEnabled).toBe(true);
    expect(json.item.settings.emailNotificationsEnabled).toBe(true);
    expect(json.item.settings.weeklySummaryEnabled).toBe(true);
    expect(json.item.settings.biometricsEnabled).toBe(false);
    expect(json.item.settings.marketingOptIn).toBe(false);
  });

  it("updates and persists profile fields and per-profile settings", async () => {
    const auth = await authViaOtp(app, `profile-update-${randomUUID()}@example.com`);

    const updateResponse = await app.inject({
      method: "PATCH",
      url: "/api/v1/profile",
      headers: {
        authorization: `Bearer ${auth.token}`
      },
      payload: {
        firstName: "Dhanush",
        lastName: "K",
        displayName: "Dhanush K",
        phoneNumber: "+919999999999",
        dateOfBirth: "2002-08-21",
        city: "Bengaluru",
        country: "India",
        timezone: "Asia/Kolkata",
        locale: "en-IN",
        currency: "INR",
        occupation: "Student",
        bio: "Building Velqora to production quality.",
        settings: {
          pushNotificationsEnabled: false,
          emailNotificationsEnabled: true,
          weeklySummaryEnabled: false,
          biometricsEnabled: true,
          marketingOptIn: true
        }
      }
    });

    expect(updateResponse.statusCode).toBe(200);
    const updated = updateResponse.json() as {
      item: {
        firstName: string | null;
        lastName: string | null;
        displayName: string | null;
        settings: {
          pushNotificationsEnabled: boolean;
          weeklySummaryEnabled: boolean;
          biometricsEnabled: boolean;
          marketingOptIn: boolean;
        };
      };
    };

    expect(updated.item.firstName).toBe("Dhanush");
    expect(updated.item.lastName).toBe("K");
    expect(updated.item.displayName).toBe("Dhanush K");
    expect(updated.item.settings.pushNotificationsEnabled).toBe(false);
    expect(updated.item.settings.weeklySummaryEnabled).toBe(false);
    expect(updated.item.settings.biometricsEnabled).toBe(true);
    expect(updated.item.settings.marketingOptIn).toBe(true);

    const readBackResponse = await app.inject({
      method: "GET",
      url: "/api/v1/profile",
      headers: {
        authorization: `Bearer ${auth.token}`
      }
    });

    expect(readBackResponse.statusCode).toBe(200);
    const readBack = readBackResponse.json() as {
      item: {
        firstName: string | null;
        city: string | null;
        settings: {
          pushNotificationsEnabled: boolean;
          weeklySummaryEnabled: boolean;
          biometricsEnabled: boolean;
          marketingOptIn: boolean;
        };
      };
    };

    expect(readBack.item.firstName).toBe("Dhanush");
    expect(readBack.item.city).toBe("Bengaluru");
    expect(readBack.item.settings.pushNotificationsEnabled).toBe(false);
    expect(readBack.item.settings.weeklySummaryEnabled).toBe(false);
    expect(readBack.item.settings.biometricsEnabled).toBe(true);
    expect(readBack.item.settings.marketingOptIn).toBe(true);
  });

  it("rejects invalid profile payloads", async () => {
    const auth = await authViaOtp(app, `profile-invalid-${randomUUID()}@example.com`);

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/profile",
      headers: {
        authorization: `Bearer ${auth.token}`
      },
      payload: {
        avatarUrl: "https://invalid.example.com/avatar.png"
      }
    });

    expect(response.statusCode).toBe(400);
    const json = response.json() as {
      error: {
        code: string;
      };
    };

    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires auth for profile endpoints", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/profile"
    });

    expect(response.statusCode).toBe(401);
  });

  it("rejects avatar upload without a file payload", async () => {
    const auth = await authViaOtp(app, `profile-avatar-missing-${randomUUID()}@example.com`);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/profile/avatar",
      headers: {
        authorization: `Bearer ${auth.token}`
      }
    });

    expect(response.statusCode).toBe(400);
    const json = response.json() as { error: { code: string } };
    expect(json.error.code).toBe("AVATAR_FILE_REQUIRED");
  });

  it("supports avatar removal endpoint", async () => {
    const auth = await authViaOtp(app, `profile-avatar-remove-${randomUUID()}@example.com`);

    const seedResponse = await uploadTestAvatar(app, auth.token);
    expect(seedResponse.statusCode).toBe(200);

    const removeResponse = await app.inject({
      method: "DELETE",
      url: "/api/v1/profile/avatar",
      headers: {
        authorization: `Bearer ${auth.token}`
      }
    });

    expect(removeResponse.statusCode).toBe(200);
    const removedJson = removeResponse.json() as { item: { avatarUrl: string | null } };
    expect(removedJson.item.avatarUrl).toBeNull();
  });

  it("persists avatar content across app restarts", async () => {
    const auth = await authViaOtp(app, `profile-avatar-persist-${randomUUID()}@example.com`);

    const uploadResponse = await uploadTestAvatar(app, auth.token);
    expect(uploadResponse.statusCode).toBe(200);

    const uploaded = uploadResponse.json() as { item: { avatarUrl: string | null } };
    expect(uploaded.item.avatarUrl).toContain("/api/v1/profile/avatar/");

    const avatarPath = uploaded.item.avatarUrl ?? "";

    await app.close();
    app = await createApp();
    await app.ready();

    const avatarResponse = await app.inject({
      method: "GET",
      url: avatarPath
    });

    expect(avatarResponse.statusCode).toBe(200);
    expect(avatarResponse.headers["content-type"]).toContain("image/png");
  });

  it("rejects direct avatarUrl patches even when the URL looks valid", async () => {
    const auth = await authViaOtp(app, `profile-avatar-direct-${randomUUID()}@example.com`);

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/profile",
      headers: {
        authorization: `Bearer ${auth.token}`
      },
      payload: {
        avatarUrl: "https://images.example.com/avatar.png"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<{ error: { code: string } }>().error.code).toBe("VALIDATION_ERROR");
  });

  it("stores avatar URLs as app-relative paths even when spoofed forwarded headers are sent", async () => {
    const auth = await authViaOtp(app, `profile-avatar-host-${randomUUID()}@example.com`);

    const pngBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47,
      0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52
    ]);
    const multipartPayload = createMultipartAvatarPayload("avatar.png", "image/png", pngBytes);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/profile/avatar",
      headers: {
        authorization: `Bearer ${auth.token}`,
        "content-type": `multipart/form-data; boundary=${multipartPayload.boundary}`,
        "x-forwarded-host": "evil.example.com",
        "x-forwarded-proto": "https"
      },
      payload: multipartPayload.body
    });

    expect(response.statusCode).toBe(200);
    const uploaded = response.json() as { item: { avatarUrl: string | null } };
    expect(uploaded.item.avatarUrl).toMatch(/^\/api\/v1\/profile\/avatar\//);
  });

  it("rejects files whose content does not match an allowed image signature", async () => {
    const auth = await authViaOtp(app, `profile-avatar-invalid-${randomUUID()}@example.com`);
    const badBytes = Buffer.from("not-a-real-image");
    const multipartPayload = createMultipartAvatarPayload("avatar.png", "image/png", badBytes);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/profile/avatar",
      headers: {
        authorization: `Bearer ${auth.token}`,
        "content-type": `multipart/form-data; boundary=${multipartPayload.boundary}`
      },
      payload: multipartPayload.body
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<{ error: { code: string } }>().error.code).toBe("INVALID_AVATAR_FILE_TYPE");
  });
});
