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

describe("auth + transaction integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("completes auth lifecycle and session invalidation", async () => {
    const email = `student-${randomUUID()}@example.com`;
    const auth = await authViaOtp(app, email);

    const meResponse = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: {
        authorization: `Bearer ${auth.token}`
      }
    });

    expect(meResponse.statusCode).toBe(200);

    const logoutResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: {
        authorization: `Bearer ${auth.token}`
      }
    });

    expect(logoutResponse.statusCode).toBe(200);

    const meAfterLogout = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: {
        authorization: `Bearer ${auth.token}`
      }
    });

    expect(meAfterLogout.statusCode).toBe(401);
  });

  it("supports transaction CRUD with user isolation and filtering", async () => {
    const userA = await authViaOtp(app, `alpha-${randomUUID()}@example.com`);
    const userB = await authViaOtp(app, `beta-${randomUUID()}@example.com`);

    const categoriesResponse = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
      headers: {
        authorization: `Bearer ${userA.token}`
      }
    });

    expect(categoriesResponse.statusCode).toBe(200);
    const categoriesJson = categoriesResponse.json() as { items: Array<{ id: string; direction: string }> };
    const debitCategory = categoriesJson.items.find((item) => item.direction === "debit");
    expect(debitCategory).toBeDefined();

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: {
        authorization: `Bearer ${userA.token}`
      },
      payload: {
        direction: "debit",
        amount: 520.45,
        currency: "INR",
        categoryId: debitCategory?.id,
        counterparty: "Metro Store",
        note: "Snacks",
        occurredAt: new Date().toISOString()
      }
    });

    expect(createResponse.statusCode).toBe(200);
    const createdJson = createResponse.json() as { item: { id: string } };

    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/v1/transactions/${createdJson.item.id}`,
      headers: {
        authorization: `Bearer ${userA.token}`
      },
      payload: {
        note: "Snacks and drinks",
        direction: "debit",
        amount: 550,
        currency: "INR",
        occurredAt: new Date().toISOString()
      }
    });

    expect(updateResponse.statusCode).toBe(200);

    const listResponseUserA = await app.inject({
      method: "GET",
      url: "/api/v1/transactions?direction=debit&page=1&pageSize=20",
      headers: {
        authorization: `Bearer ${userA.token}`
      }
    });

    expect(listResponseUserA.statusCode).toBe(200);
    const listAJson = listResponseUserA.json() as {
      items: Array<{ id: string }>;
      pagination: { page: number; pageSize: number; hasMore: boolean; nextPage: number | null };
    };
    expect(listAJson.items.some((item) => item.id === createdJson.item.id)).toBe(true);
    expect(listAJson.pagination.page).toBe(1);
    expect(listAJson.pagination.pageSize).toBe(20);

    const listResponseUserB = await app.inject({
      method: "GET",
      url: "/api/v1/transactions?page=1&pageSize=20",
      headers: {
        authorization: `Bearer ${userB.token}`
      }
    });

    expect(listResponseUserB.statusCode).toBe(200);
    const listBJson = listResponseUserB.json() as { items: Array<{ id: string }> };
    expect(listBJson.items.some((item) => item.id === createdJson.item.id)).toBe(false);

    const sortingUser = await authViaOtp(app, `sort-${randomUUID()}@example.com`);
    const occurredAtBase = new Date("2026-03-11T10:00:00.000Z");

    const createForSort = async (amount: number, minutesOffset: number) => {
      const occurredAt = new Date(occurredAtBase.getTime() + minutesOffset * 60_000).toISOString();

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: {
          authorization: `Bearer ${sortingUser.token}`
        },
        payload: {
          direction: "debit",
          amount,
          currency: "INR",
          categoryId: debitCategory?.id,
          counterparty: "Sort Merchant",
          occurredAt
        }
      });

      expect(response.statusCode).toBe(200);
    };

    await createForSort(300, 1);
    await createForSort(100, 2);
    await createForSort(200, 3);

    const amountAscending = await app.inject({
      method: "GET",
      url: "/api/v1/transactions?page=1&pageSize=2&sortBy=amount&sortOrder=asc",
      headers: {
        authorization: `Bearer ${sortingUser.token}`
      }
    });

    expect(amountAscending.statusCode).toBe(200);
    const amountAscJson = amountAscending.json() as {
      items: Array<{ amount: number }>;
      pagination: { hasMore: boolean; nextPage: number | null };
    };

    expect(amountAscJson.items.map((item) => item.amount)).toEqual([100, 200]);
    expect(amountAscJson.pagination.hasMore).toBe(true);
    expect(amountAscJson.pagination.nextPage).toBe(2);

    const amountAscendingPageTwo = await app.inject({
      method: "GET",
      url: "/api/v1/transactions?page=2&pageSize=2&sortBy=amount&sortOrder=asc",
      headers: {
        authorization: `Bearer ${sortingUser.token}`
      }
    });

    expect(amountAscendingPageTwo.statusCode).toBe(200);
    const amountAscPageTwoJson = amountAscendingPageTwo.json() as {
      items: Array<{ amount: number }>;
      pagination: { hasMore: boolean; nextPage: number | null };
    };

    expect(amountAscPageTwoJson.items[0]?.amount).toBe(300);
    expect(amountAscPageTwoJson.pagination.hasMore).toBe(false);
    expect(amountAscPageTwoJson.pagination.nextPage).toBeNull();

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/transactions/${createdJson.item.id}`,
      headers: {
        authorization: `Bearer ${userA.token}`
      }
    });

    expect(deleteResponse.statusCode).toBe(200);
  });

  it("returns bootstrap defaults and keeps sms disabled", async () => {
    const bootstrapResponse = await app.inject({
      method: "GET",
      url: "/api/v1/bootstrap"
    });

    expect(bootstrapResponse.statusCode).toBe(200);
    const bootstrapJson = bootstrapResponse.json() as {
      featureFlags: { smsImportEnabledByDefault: boolean };
      legal: { smsDisclosureVersion: string };
    };

    expect(bootstrapJson.featureFlags.smsImportEnabledByDefault).toBe(false);
    expect(typeof bootstrapJson.legal.smsDisclosureVersion).toBe("string");
  });
});
