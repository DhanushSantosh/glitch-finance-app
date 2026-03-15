import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";

type AuthResult = {
  token: string;
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
  };

  return {
    token: verifyJson.token
  };
};

describe("resilience and idempotency integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("replays transaction create and delete for matching idempotency keys", async () => {
    const auth = await authViaOtp(app, `resilience-idempotency-${randomUUID()}@example.com`);

    const categoriesResponse = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
      headers: {
        authorization: `Bearer ${auth.token}`
      }
    });

    expect(categoriesResponse.statusCode).toBe(200);
    const categoriesJson = categoriesResponse.json() as { items: Array<{ id: string; direction: string }> };
    const debitCategory = categoriesJson.items.find((item) => item.direction === "debit");
    expect(debitCategory).toBeDefined();

    const createKey = `create-${randomUUID()}`;
    const payload = {
      direction: "debit",
      amount: 321.45,
      currency: "INR",
      categoryId: debitCategory?.id,
      counterparty: "Replay Merchant",
      note: "idempotent-create",
      occurredAt: "2026-03-15T10:00:00.000Z"
    };

    const createFirst = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: {
        authorization: `Bearer ${auth.token}`,
        "idempotency-key": createKey
      },
      payload
    });

    expect(createFirst.statusCode).toBe(200);
    const createdFirst = createFirst.json() as { item: { id: string } };

    const createReplay = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: {
        authorization: `Bearer ${auth.token}`,
        "idempotency-key": createKey
      },
      payload
    });

    expect(createReplay.statusCode).toBe(200);
    expect(createReplay.headers["x-idempotent-replay"]).toBe("true");
    const createdReplay = createReplay.json() as { item: { id: string } };
    expect(createdReplay.item.id).toBe(createdFirst.item.id);

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/v1/transactions?page=1&pageSize=50",
      headers: {
        authorization: `Bearer ${auth.token}`
      }
    });

    expect(listResponse.statusCode).toBe(200);
    const listJson = listResponse.json() as { items: Array<{ id: string }> };
    const matching = listJson.items.filter((item) => item.id === createdFirst.item.id);
    expect(matching).toHaveLength(1);

    const updateKey = `update-${randomUUID()}`;
    const updatePayload = {
      amount: 401.1,
      direction: "debit",
      currency: "INR",
      note: "idempotent-update",
      occurredAt: "2026-03-15T11:00:00.000Z"
    };

    const updateFirst = await app.inject({
      method: "PATCH",
      url: `/api/v1/transactions/${createdFirst.item.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
        "idempotency-key": updateKey
      },
      payload: updatePayload
    });

    expect(updateFirst.statusCode).toBe(200);
    const updateFirstJson = updateFirst.json() as { item: { amount: number; note: string | null } };
    expect(updateFirstJson.item.amount).toBe(401.1);
    expect(updateFirstJson.item.note).toBe("idempotent-update");

    const updateReplay = await app.inject({
      method: "PATCH",
      url: `/api/v1/transactions/${createdFirst.item.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
        "idempotency-key": updateKey
      },
      payload: updatePayload
    });

    expect(updateReplay.statusCode).toBe(200);
    expect(updateReplay.headers["x-idempotent-replay"]).toBe("true");
    const updateReplayJson = updateReplay.json() as { item: { amount: number; note: string | null } };
    expect(updateReplayJson.item.amount).toBe(401.1);
    expect(updateReplayJson.item.note).toBe("idempotent-update");

    const deleteKey = `delete-${randomUUID()}`;
    const deleteFirst = await app.inject({
      method: "DELETE",
      url: `/api/v1/transactions/${createdFirst.item.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
        "idempotency-key": deleteKey
      }
    });

    expect(deleteFirst.statusCode).toBe(200);

    const deleteReplay = await app.inject({
      method: "DELETE",
      url: `/api/v1/transactions/${createdFirst.item.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
        "idempotency-key": deleteKey
      }
    });

    expect(deleteReplay.statusCode).toBe(200);
    expect(deleteReplay.headers["x-idempotent-replay"]).toBe("true");
  });

  it("rejects idempotency key reuse for a different payload", async () => {
    const auth = await authViaOtp(app, `resilience-conflict-${randomUUID()}@example.com`);
    const categoriesResponse = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
      headers: {
        authorization: `Bearer ${auth.token}`
      }
    });
    expect(categoriesResponse.statusCode).toBe(200);
    const categoriesJson = categoriesResponse.json() as { items: Array<{ id: string; direction: string }> };
    const debitCategory = categoriesJson.items.find((item) => item.direction === "debit");
    expect(debitCategory).toBeDefined();

    const idempotencyKey = `conflict-${randomUUID()}`;
    const firstRequest = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: {
        authorization: `Bearer ${auth.token}`,
        "idempotency-key": idempotencyKey
      },
      payload: {
        direction: "debit",
        amount: 100,
        currency: "INR",
        categoryId: debitCategory?.id,
        counterparty: "Same Key",
        occurredAt: "2026-03-15T10:10:00.000Z"
      }
    });

    expect(firstRequest.statusCode).toBe(200);

    const conflictingRequest = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: {
        authorization: `Bearer ${auth.token}`,
        "idempotency-key": idempotencyKey
      },
      payload: {
        direction: "debit",
        amount: 101,
        currency: "INR",
        categoryId: debitCategory?.id,
        counterparty: "Same Key",
        occurredAt: "2026-03-15T10:10:00.000Z"
      }
    });

    expect(conflictingRequest.statusCode).toBe(409);
    const body = conflictingRequest.json() as { error: { code: string } };
    expect(body.error.code).toBe("IDEMPOTENCY_KEY_CONFLICT");
  });

  it("maps empty JSON delete body parser failures to stable 4xx envelopes", async () => {
    const auth = await authViaOtp(app, `resilience-empty-json-${randomUUID()}@example.com`);
    const categoriesResponse = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
      headers: {
        authorization: `Bearer ${auth.token}`
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
        authorization: `Bearer ${auth.token}`
      },
      payload: {
        direction: "debit",
        amount: 220,
        currency: "INR",
        categoryId: debitCategory?.id,
        counterparty: "Delete Target",
        occurredAt: "2026-03-15T10:20:00.000Z"
      }
    });
    expect(createResponse.statusCode).toBe(200);
    const transactionId = (createResponse.json() as { item: { id: string } }).item.id;

    const deleteWithEmptyJson = await app.inject({
      method: "DELETE",
      url: `/api/v1/transactions/${transactionId}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
        "content-type": "application/json"
      },
      payload: ""
    });

    expect(deleteWithEmptyJson.statusCode).toBe(400);
    const body = deleteWithEmptyJson.json() as { error: { code: string; message: string }; requestId: string };
    expect(body.error.code).toBe("FST_ERR_CTP_EMPTY_JSON_BODY");
    expect(typeof body.requestId).toBe("string");
  });

  it("maps budget unique violations to conflict responses instead of 5xx", async () => {
    const auth = await authViaOtp(app, `resilience-budget-${randomUUID()}@example.com`);
    const month = "2026-03";

    const categoriesResponse = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
      headers: {
        authorization: `Bearer ${auth.token}`
      }
    });
    expect(categoriesResponse.statusCode).toBe(200);
    const categoriesJson = categoriesResponse.json() as { items: Array<{ id: string; direction: string }> };
    const debitCategories = categoriesJson.items.filter((item) => item.direction === "debit");
    expect(debitCategories.length).toBeGreaterThanOrEqual(2);

    const createFirst = await app.inject({
      method: "POST",
      url: "/api/v1/budgets",
      headers: {
        authorization: `Bearer ${auth.token}`
      },
      payload: {
        categoryId: debitCategories[0]?.id,
        month,
        amount: 1200,
        currency: "INR"
      }
    });
    expect(createFirst.statusCode).toBe(200);

    const createSecond = await app.inject({
      method: "POST",
      url: "/api/v1/budgets",
      headers: {
        authorization: `Bearer ${auth.token}`
      },
      payload: {
        categoryId: debitCategories[1]?.id,
        month,
        amount: 1400,
        currency: "INR"
      }
    });
    expect(createSecond.statusCode).toBe(200);
    const secondBudgetId = (createSecond.json() as { item: { id: string } }).item.id;

    const conflictUpdate = await app.inject({
      method: "PATCH",
      url: `/api/v1/budgets/${secondBudgetId}`,
      headers: {
        authorization: `Bearer ${auth.token}`
      },
      payload: {
        categoryId: debitCategories[0]?.id,
        month
      }
    });

    expect(conflictUpdate.statusCode).toBe(409);
    const body = conflictUpdate.json() as { error: { code: string } };
    expect(body.error.code).toBe("CONFLICT");
  });
});
