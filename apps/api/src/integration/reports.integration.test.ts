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
      amount: 10,
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
    expect(summaryJson.totals.expense).toBe(2448.12);
    expect(summaryJson.totals.transfer).toBe(700);
    expect(summaryJson.totals.net).toBe(551.88);
    expect(summaryJson.totals.transactionCount).toBe(5);

    expect(summaryJson.topCategories[0]?.amount).toBe(2448.12);
    expect(summaryJson.topCategories[0]?.transactionCount).toBe(3);

    const march3 = summaryJson.dailySeries.find((item) => item.date === "2026-03-03");
    expect(march3).toBeDefined();
    expect(march3?.income).toBe(3000);
    expect(march3?.expense).toBe(500);
    expect(march3?.net).toBe(2500);

    expect(summaryJson.dailySeries).toHaveLength(31);
  });

  it("converts mixed-currency month summaries into the requested display currency", async () => {
    const user = await authViaOtp(app, `reports-convert-${randomUUID()}@example.com`);

    const responseA = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: {
        authorization: `Bearer ${user.token}`
      },
      payload: {
        direction: "credit",
        amount: 100,
        occurredAt: "2026-03-08T10:00:00.000Z",
        currency: "USD"
      }
    });
    expect(responseA.statusCode).toBe(200);

    const responseB = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: {
        authorization: `Bearer ${user.token}`
      },
      payload: {
        direction: "debit",
        amount: 1000,
        occurredAt: "2026-03-08T12:00:00.000Z",
        currency: "INR"
      }
    });
    expect(responseB.statusCode).toBe(200);

    const summaryResponse = await app.inject({
      method: "GET",
      url: "/api/v1/reports/summary?month=2026-03&currency=USD",
      headers: {
        authorization: `Bearer ${user.token}`
      }
    });

    expect(summaryResponse.statusCode).toBe(200);
    const summaryJson = summaryResponse.json() as {
      totals: { income: number; expense: number; net: number; currency: string; transactionCount: number };
    };

    expect(summaryJson.totals.currency).toBe("USD");
    expect(summaryJson.totals.income).toBe(100);
    expect(summaryJson.totals.expense).toBe(10.55);
    expect(summaryJson.totals.net).toBe(89.45);
    expect(summaryJson.totals.transactionCount).toBe(2);
  });

  it("returns the latest exchange-rate snapshot in the requested base currency", async () => {
    const user = await authViaOtp(app, `reports-fx-${randomUUID()}@example.com`);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/fx/latest?base=USD",
      headers: {
        authorization: `Bearer ${user.token}`
      }
    });

    expect(response.statusCode).toBe(200);
    const json = response.json() as {
      provider: string;
      asOf: string;
      baseCurrency: string;
      rates: Record<string, number>;
    };

    expect(json.provider).toBe("ecb");
    expect(json.asOf).toBeTruthy();
    expect(json.baseCurrency).toBe("USD");
    expect(json.rates.USD).toBe(1);
    expect(json.rates.INR).toBeGreaterThan(90);
    expect(json.rates.EUR).toBeLessThan(1);
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

  it("uses profile currency and timezone defaults when query omits currency", async () => {
    const user = await authViaOtp(app, `reports-regional-${randomUUID()}@example.com`);

    const updateProfileResponse = await app.inject({
      method: "PATCH",
      url: "/api/v1/profile",
      headers: {
        authorization: `Bearer ${user.token}`
      },
      payload: {
        timezone: "America/Los_Angeles",
        locale: "en-US",
        currency: "USD"
      }
    });

    expect(updateProfileResponse.statusCode).toBe(200);

    const categoriesResponse = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
      headers: {
        authorization: `Bearer ${user.token}`
      }
    });

    const categoryJson = categoriesResponse.json() as { items: Array<{ id: string; direction: string }> };
    const debitCategory = categoryJson.items.find((item) => item.direction === "debit");
    expect(debitCategory).toBeDefined();

    const createTx = async (occurredAt: string, amount: number) => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          direction: "debit",
          amount,
          categoryId: debitCategory?.id,
          currency: "USD",
          occurredAt
        }
      });
      expect(response.statusCode).toBe(200);
    };

    // Feb 28 23:30 in America/Los_Angeles (excluded from March window)
    await createTx("2026-03-01T07:30:00.000Z", 20);
    // Mar 1 00:30 in America/Los_Angeles (included in March window)
    await createTx("2026-03-01T08:30:00.000Z", 80);

    const summaryResponse = await app.inject({
      method: "GET",
      url: "/api/v1/reports/summary?month=2026-03",
      headers: {
        authorization: `Bearer ${user.token}`
      }
    });

    expect(summaryResponse.statusCode).toBe(200);
    const summaryJson = summaryResponse.json() as {
      totals: { currency: string; expense: number; transactionCount: number };
      dailySeries: Array<{ date: string; expense: number }>;
    };

    expect(summaryJson.totals.currency).toBe("USD");
    expect(summaryJson.totals.expense).toBe(80);
    expect(summaryJson.totals.transactionCount).toBe(1);

    const marchFirst = summaryJson.dailySeries.find((item) => item.date === "2026-03-01");
    expect(marchFirst?.expense).toBe(80);
  });

  it("GET /api/v1/reports/export returns 401 when unauthenticated", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/reports/export?month=2026-03&format=csv"
    });

    expect(response.statusCode).toBe(401);
  });

  it("GET /api/v1/reports/export?format=invalid returns 400", async () => {
    const user = await authViaOtp(app, `reports-invalid-fmt-${randomUUID()}@example.com`);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/reports/export?month=2026-03&format=invalid",
      headers: {
        authorization: `Bearer ${user.token}`
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("GET /api/v1/reports/export without format defaults to csv and returns 200", async () => {
    const user = await authViaOtp(app, `reports-no-fmt-${randomUUID()}@example.com`);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/reports/export?month=2026-03",
      headers: {
        authorization: `Bearer ${user.token}`
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/csv");
  });

  it("GET /api/v1/reports/export?format=csv returns 200 with correct headers and CSV body", async () => {
    const user = await authViaOtp(app, `reports-csv-check-${randomUUID()}@example.com`);

    const categoriesResponse = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
      headers: { authorization: `Bearer ${user.token}` }
    });
    const categoryJson = categoriesResponse.json() as { items: Array<{ id: string; direction: string }> };
    const debitCategory = categoryJson.items.find((item) => item.direction === "debit");
    expect(debitCategory).toBeDefined();

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: { authorization: `Bearer ${user.token}` },
      payload: {
        direction: "debit",
        amount: 150,
        currency: "INR",
        categoryId: debitCategory?.id,
        counterparty: "Test Merchant",
        occurredAt: "2026-03-10T10:00:00.000Z"
      }
    });
    expect(createResponse.statusCode).toBe(200);

    const csvResponse = await app.inject({
      method: "GET",
      url: "/api/v1/reports/export?month=2026-03&format=csv",
      headers: { authorization: `Bearer ${user.token}` }
    });

    expect(csvResponse.statusCode).toBe(200);
    expect(csvResponse.headers["content-type"]).toContain("text/csv");
    expect(csvResponse.headers["content-disposition"]).toContain("glitch-report-2026-03.csv");
    // body is valid CSV with a header row
    const lines = csvResponse.body.trim().split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(1);
    expect(lines[0]).toContain(",");
  });

  it("GET /api/v1/reports/export?format=pdf returns 200 with application/pdf and non-empty buffer", async () => {
    const user = await authViaOtp(app, `reports-pdf-check-${randomUUID()}@example.com`);

    const pdfResponse = await app.inject({
      method: "GET",
      url: "/api/v1/reports/export?month=2026-03&format=pdf",
      headers: { authorization: `Bearer ${user.token}` }
    });

    expect(pdfResponse.statusCode).toBe(200);
    expect(pdfResponse.headers["content-type"]).toContain("application/pdf");
    expect(pdfResponse.headers["content-disposition"]).toContain("glitch-report-2026-03.pdf");
    expect(pdfResponse.rawPayload.length).toBeGreaterThan(0);
  });

  it("exports report summary as csv and pdf", async () => {
    const user = await authViaOtp(app, `reports-export-${randomUUID()}@example.com`);

    const categoriesResponse = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
      headers: {
        authorization: `Bearer ${user.token}`
      }
    });
    const categoryJson = categoriesResponse.json() as { items: Array<{ id: string; direction: string }> };
    const debitCategory = categoryJson.items.find((item) => item.direction === "debit");
    expect(debitCategory).toBeDefined();

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: {
        authorization: `Bearer ${user.token}`
      },
      payload: {
        direction: "debit",
        amount: 321,
        currency: "INR",
        categoryId: debitCategory?.id,
        counterparty: "Export Check",
        occurredAt: "2026-03-08T10:00:00.000Z"
      }
    });
    expect(createResponse.statusCode).toBe(200);

    const csvResponse = await app.inject({
      method: "GET",
      url: "/api/v1/reports/export?month=2026-03&format=csv",
      headers: {
        authorization: `Bearer ${user.token}`
      }
    });

    expect(csvResponse.statusCode).toBe(200);
    expect(csvResponse.headers["content-type"]).toContain("text/csv");
    expect(csvResponse.headers["content-disposition"]).toContain("glitch-report-2026-03.csv");
    expect(csvResponse.body).toContain("section,key,value");
    expect(csvResponse.body).toContain("totals,expense");

    const pdfResponse = await app.inject({
      method: "GET",
      url: "/api/v1/reports/export?month=2026-03&format=pdf",
      headers: {
        authorization: `Bearer ${user.token}`
      }
    });

    expect(pdfResponse.statusCode).toBe(200);
    expect(pdfResponse.headers["content-type"]).toContain("application/pdf");
    expect(pdfResponse.headers["content-disposition"]).toContain("glitch-report-2026-03.pdf");
    expect(pdfResponse.rawPayload.slice(0, 8).toString("utf8")).toContain("%PDF-1.4");
  });
});
