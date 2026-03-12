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

describe("reports integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns month summary totals, top categories and daily series", async () => {
    const user = await authViaOtp(app, `reports-${randomUUID()}@example.com`);

    const categoriesResponse = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
      headers: {
        authorization: `Bearer ${user.token}`
      }
    });

    expect(categoriesResponse.statusCode).toBe(200);
    const categoryJson = categoriesResponse.json() as { items: Array<{ id: string; direction: string }> };
    const debitCategory = categoryJson.items.find((item) => item.direction === "debit");
    const creditCategory = categoryJson.items.find((item) => item.direction === "credit");

    expect(debitCategory).toBeDefined();
    expect(creditCategory).toBeDefined();

    const createTx = async (payload: {
      direction: "debit" | "credit" | "transfer";
      amount: number;
      categoryId?: string;
      occurredAt: string;
      currency?: string;
    }) => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          direction: payload.direction,
          amount: payload.amount,
          categoryId: payload.categoryId,
          occurredAt: payload.occurredAt,
          currency: payload.currency ?? "INR"
        }
      });
      expect(response.statusCode).toBe(200);
    };

    await createTx({
      direction: "debit",
      amount: 1000,
      categoryId: debitCategory?.id,
      occurredAt: "2026-03-02T08:00:00.000Z"
    });
    await createTx({
      direction: "credit",
      amount: 3000,
      categoryId: creditCategory?.id,
      occurredAt: "2026-03-03T09:00:00.000Z"
    });
    await createTx({
      direction: "debit",
      amount: 500,
      categoryId: debitCategory?.id,
      occurredAt: "2026-03-03T12:00:00.000Z"
    });
    await createTx({
      direction: "transfer",
      amount: 700,
      occurredAt: "2026-03-05T10:00:00.000Z"
    });

    await createTx({
      direction: "debit",
      amount: 999,
      categoryId: debitCategory?.id,
      occurredAt: "2026-03-04T10:00:00.000Z",
      currency: "USD"
    });

    const summaryResponse = await app.inject({
      method: "GET",
      url: "/api/v1/reports/summary?month=2026-03",
      headers: {
        authorization: `Bearer ${user.token}`
      }
    });

    expect(summaryResponse.statusCode).toBe(200);
    const summaryJson = summaryResponse.json() as {
      month: string;
      totals: {
        income: number;
        expense: number;
        transfer: number;
        net: number;
        transactionCount: number;
        currency: string;
      };
      topCategories: Array<{
        categoryName: string;
        amount: number;
        transactionCount: number;
      }>;
      dailySeries: Array<{
        date: string;
        income: number;
        expense: number;
        net: number;
      }>;
    };

    expect(summaryJson.month).toBe("2026-03");
    expect(summaryJson.totals.currency).toBe("INR");
    expect(summaryJson.totals.income).toBe(3000);
    expect(summaryJson.totals.expense).toBe(1500);
    expect(summaryJson.totals.transfer).toBe(700);
    expect(summaryJson.totals.net).toBe(1500);
    expect(summaryJson.totals.transactionCount).toBe(4);

    expect(summaryJson.topCategories[0]?.amount).toBe(1500);
    expect(summaryJson.topCategories[0]?.transactionCount).toBe(2);

    const march3 = summaryJson.dailySeries.find((item) => item.date === "2026-03-03");
    expect(march3).toBeDefined();
    expect(march3?.income).toBe(3000);
    expect(march3?.expense).toBe(500);
    expect(march3?.net).toBe(2500);

    expect(summaryJson.dailySeries).toHaveLength(31);
  });

  it("enforces user isolation for report summary", async () => {
    const userA = await authViaOtp(app, `reports-a-${randomUUID()}@example.com`);
    const userB = await authViaOtp(app, `reports-b-${randomUUID()}@example.com`);

    const categoriesResponse = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
      headers: {
        authorization: `Bearer ${userA.token}`
      }
    });

    const categoryJson = categoriesResponse.json() as { items: Array<{ id: string; direction: string }> };
    const debitCategory = categoryJson.items.find((item) => item.direction === "debit");
    expect(debitCategory).toBeDefined();

    const createForUser = async (token: string, amount: number) => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: {
          authorization: `Bearer ${token}`
        },
        payload: {
          direction: "debit",
          amount,
          categoryId: debitCategory?.id,
          occurredAt: "2026-03-06T10:00:00.000Z",
          currency: "INR"
        }
      });
      expect(response.statusCode).toBe(200);
    };

    await createForUser(userA.token, 250);
    await createForUser(userB.token, 9999);

    const summaryResponse = await app.inject({
      method: "GET",
      url: "/api/v1/reports/summary?month=2026-03",
      headers: {
        authorization: `Bearer ${userA.token}`
      }
    });

    expect(summaryResponse.statusCode).toBe(200);
    const summaryJson = summaryResponse.json() as {
      totals: { expense: number; transactionCount: number };
    };

    expect(summaryJson.totals.expense).toBe(250);
    expect(summaryJson.totals.transactionCount).toBe(1);
  });
});
