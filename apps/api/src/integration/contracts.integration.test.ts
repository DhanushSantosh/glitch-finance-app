import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { createApp } from "../app.js";

const isoDateTimeStringSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)));

const validationDetailsSchema = z
  .object({
    formErrors: z.array(z.string()),
    fieldErrors: z.record(z.string(), z.array(z.string()).optional())
  })
  .strict();

const errorEnvelopeSchema = z
  .object({
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.unknown().optional()
      })
      .strict(),
    requestId: z.string().min(1)
  })
  .strict();

const validationErrorEnvelopeSchema = z
  .object({
    error: z
      .object({
        code: z.literal("VALIDATION_ERROR"),
        message: z.string(),
        details: validationDetailsSchema
      })
      .strict(),
    requestId: z.string().min(1)
  })
  .strict();

const successSchema = z.object({ success: z.literal(true) }).strict();

const categorySchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
    direction: z.enum(["debit", "credit", "transfer"]),
    isDefault: z.boolean()
  })
  .strict();

const authRequestOtpResponseSchema = z
  .object({
    message: z.string().min(1),
    debugOtpCode: z.string().regex(/^\d{6}$/).optional()
  })
  .strict();

const authVerifyResponseSchema = z
  .object({
    token: z.string().min(20),
    user: z
      .object({
        id: z.string().uuid(),
        email: z.string().email()
      })
      .strict(),
    session: z
      .object({
        expiresInDays: z.number().int().min(1)
      })
      .strict()
  })
  .strict();

const meResponseSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email()
  })
  .strict();

const transactionItemSchema = z
  .object({
    id: z.string().uuid(),
    categoryId: z.string().uuid().nullable(),
    categoryName: z.string().nullable(),
    direction: z.enum(["debit", "credit", "transfer"]),
    amount: z.number(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    counterparty: z.string().nullable(),
    note: z.string().nullable(),
    occurredAt: isoDateTimeStringSchema,
    createdAt: isoDateTimeStringSchema,
    updatedAt: isoDateTimeStringSchema
  })
  .strict();

const transactionListResponseSchema = z
  .object({
    items: z.array(transactionItemSchema),
    pagination: z
      .object({
        page: z.number().int().min(1),
        pageSize: z.number().int().min(1),
        hasMore: z.boolean(),
        nextPage: z.number().int().min(1).nullable()
      })
      .strict()
  })
  .strict();

const budgetItemSchema = z
  .object({
    id: z.string().uuid(),
    categoryId: z.string().uuid(),
    categoryName: z.string().min(1).optional(),
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    amount: z.number(),
    spentAmount: z.number().optional(),
    remainingAmount: z.number().optional(),
    utilizationPercent: z.number().optional(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    createdAt: isoDateTimeStringSchema,
    updatedAt: isoDateTimeStringSchema
  })
  .strict();

const budgetListResponseSchema = z
  .object({
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    items: z.array(
      budgetItemSchema.extend({
        categoryName: z.string().min(1),
        spentAmount: z.number(),
        remainingAmount: z.number(),
        utilizationPercent: z.number()
      })
    ),
    totals: z
      .object({
        budgeted: z.number(),
        spent: z.number(),
        remaining: z.number()
      })
      .strict()
  })
  .strict();

const goalItemSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
    targetAmount: z.number(),
    currentAmount: z.number(),
    remainingAmount: z.number(),
    progressPercent: z.number(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    targetDate: isoDateTimeStringSchema.nullable(),
    closedAt: isoDateTimeStringSchema.nullable(),
    isCompleted: z.boolean(),
    createdAt: isoDateTimeStringSchema,
    updatedAt: isoDateTimeStringSchema
  })
  .strict();

const goalsListResponseSchema = z
  .object({
    items: z.array(goalItemSchema)
  })
  .strict();

const parseJson = <T>(input: unknown, schema: z.ZodType<T>): T => schema.parse(input);

const requestOtpCode = async (app: FastifyInstance, email: string): Promise<string> => {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/request-otp",
    payload: { email }
  });

  expect(response.statusCode).toBe(200);
  const body = parseJson(response.json(), authRequestOtpResponseSchema);
  expect(body.debugOtpCode).toBeDefined();
  return body.debugOtpCode as string;
};

const authenticate = async (
  app: FastifyInstance,
  email: string
): Promise<{ token: string; user: { id: string; email: string } }> => {
  const otpCode = await requestOtpCode(app, email);
  const verifyResponse = await app.inject({
    method: "POST",
    url: "/api/v1/auth/verify-otp",
    payload: {
      email,
      code: otpCode
    }
  });

  expect(verifyResponse.statusCode).toBe(200);
  const verifyBody = parseJson(verifyResponse.json(), authVerifyResponseSchema);
  return {
    token: verifyBody.token,
    user: verifyBody.user
  };
};

describe("api contracts", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("validates auth success and error envelopes", async () => {
    const email = `contracts-auth-${randomUUID()}@example.com`;

    const invalidRequestOtpResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/request-otp",
      payload: { email: "not-an-email" }
    });
    expect(invalidRequestOtpResponse.statusCode).toBe(400);
    parseJson(invalidRequestOtpResponse.json(), validationErrorEnvelopeSchema);

    const otpCode = await requestOtpCode(app, email);

    const invalidVerifyResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify-otp",
      payload: { email, code: "123" }
    });
    expect(invalidVerifyResponse.statusCode).toBe(400);
    parseJson(invalidVerifyResponse.json(), validationErrorEnvelopeSchema);

    const verifyResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify-otp",
      payload: { email, code: otpCode }
    });
    expect(verifyResponse.statusCode).toBe(200);
    const verifyBody = parseJson(verifyResponse.json(), authVerifyResponseSchema);

    const meResponse = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: {
        authorization: `Bearer ${verifyBody.token}`
      }
    });
    expect(meResponse.statusCode).toBe(200);
    parseJson(meResponse.json(), meResponseSchema);

    const logoutResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: {
        authorization: `Bearer ${verifyBody.token}`
      }
    });
    expect(logoutResponse.statusCode).toBe(200);
    parseJson(logoutResponse.json(), successSchema);

    const meAfterLogoutResponse = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: {
        authorization: `Bearer ${verifyBody.token}`
      }
    });
    expect(meAfterLogoutResponse.statusCode).toBe(401);
    const unauthorized = parseJson(meAfterLogoutResponse.json(), errorEnvelopeSchema);
    expect(unauthorized.error.code).toBe("UNAUTHORIZED");
  });

  it("validates transaction contracts and error envelopes", async () => {
    const email = `contracts-transactions-${randomUUID()}@example.com`;
    const auth = await authenticate(app, email);

    const categoriesResponse = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
      headers: { authorization: `Bearer ${auth.token}` }
    });
    expect(categoriesResponse.statusCode).toBe(200);
    const categoriesBody = parseJson(
      categoriesResponse.json(),
      z.object({ items: z.array(categorySchema) }).strict()
    );
    const debitCategory = categoriesBody.items.find((item) => item.direction === "debit");
    expect(debitCategory).toBeDefined();

    const unauthorizedListResponse = await app.inject({
      method: "GET",
      url: "/api/v1/transactions?page=1&pageSize=20"
    });
    expect(unauthorizedListResponse.statusCode).toBe(401);
    parseJson(unauthorizedListResponse.json(), errorEnvelopeSchema);

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: { authorization: `Bearer ${auth.token}` },
      payload: {
        direction: "debit",
        amount: 250.5,
        currency: "INR",
        categoryId: debitCategory?.id,
        counterparty: "Contract Test Merchant",
        note: "Contract test note",
        occurredAt: new Date().toISOString()
      }
    });
    expect(createResponse.statusCode).toBe(200);
    const created = parseJson(createResponse.json(), z.object({ item: transactionItemSchema }).strict());

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/v1/transactions?page=1&pageSize=20&sortBy=occurredAt&sortOrder=desc",
      headers: { authorization: `Bearer ${auth.token}` }
    });
    expect(listResponse.statusCode).toBe(200);
    const listBody = parseJson(listResponse.json(), transactionListResponseSchema);
    expect(listBody.items.some((item) => item.id === created.item.id)).toBe(true);

    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/v1/transactions/${created.item.id}`,
      headers: { authorization: `Bearer ${auth.token}` },
      payload: {
        amount: 300.75,
        direction: "debit",
        currency: "INR",
        occurredAt: new Date().toISOString()
      }
    });
    expect(updateResponse.statusCode).toBe(200);
    parseJson(updateResponse.json(), z.object({ item: transactionItemSchema }).strict());

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/transactions/${created.item.id}`,
      headers: { authorization: `Bearer ${auth.token}` }
    });
    expect(deleteResponse.statusCode).toBe(200);
    parseJson(deleteResponse.json(), successSchema);

    const deleteAgainResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/transactions/${created.item.id}`,
      headers: { authorization: `Bearer ${auth.token}` }
    });
    expect(deleteAgainResponse.statusCode).toBe(404);
    const notFound = parseJson(deleteAgainResponse.json(), errorEnvelopeSchema);
    expect(notFound.error.code).toBe("TRANSACTION_NOT_FOUND");
  });

  it("validates budget contracts and error envelopes", async () => {
    const email = `contracts-budgets-${randomUUID()}@example.com`;
    const auth = await authenticate(app, email);

    const categoriesResponse = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
      headers: { authorization: `Bearer ${auth.token}` }
    });
    expect(categoriesResponse.statusCode).toBe(200);
    const categoriesBody = parseJson(
      categoriesResponse.json(),
      z.object({ items: z.array(categorySchema) }).strict()
    );
    const debitCategory = categoriesBody.items.find((item) => item.direction === "debit");
    expect(debitCategory).toBeDefined();

    const month = "2026-03";

    const listResponse = await app.inject({
      method: "GET",
      url: `/api/v1/budgets?month=${month}`,
      headers: { authorization: `Bearer ${auth.token}` }
    });
    expect(listResponse.statusCode).toBe(200);
    parseJson(listResponse.json(), budgetListResponseSchema);

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/budgets",
      headers: { authorization: `Bearer ${auth.token}` },
      payload: {
        categoryId: debitCategory?.id,
        month,
        amount: 5000,
        currency: "INR"
      }
    });
    expect(createResponse.statusCode).toBe(200);
    const created = parseJson(createResponse.json(), z.object({ item: budgetItemSchema }).strict());

    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/v1/budgets/${created.item.id}`,
      headers: { authorization: `Bearer ${auth.token}` },
      payload: {
        amount: 6500
      }
    });
    expect(updateResponse.statusCode).toBe(200);
    parseJson(updateResponse.json(), z.object({ item: budgetItemSchema }).strict());

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/budgets/${created.item.id}`,
      headers: { authorization: `Bearer ${auth.token}` }
    });
    expect(deleteResponse.statusCode).toBe(200);
    parseJson(deleteResponse.json(), successSchema);

    const deleteAgainResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/budgets/${created.item.id}`,
      headers: { authorization: `Bearer ${auth.token}` }
    });
    expect(deleteAgainResponse.statusCode).toBe(404);
    const notFound = parseJson(deleteAgainResponse.json(), errorEnvelopeSchema);
    expect(notFound.error.code).toBe("BUDGET_NOT_FOUND");
  });

  it("validates goal contracts and error envelopes", async () => {
    const email = `contracts-goals-${randomUUID()}@example.com`;
    const auth = await authenticate(app, email);

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/v1/goals",
      headers: { authorization: `Bearer ${auth.token}` }
    });
    expect(listResponse.statusCode).toBe(200);
    parseJson(listResponse.json(), goalsListResponseSchema);

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/goals",
      headers: { authorization: `Bearer ${auth.token}` },
      payload: {
        name: "Contract Goal",
        targetAmount: 10000,
        currentAmount: 2000,
        currency: "INR",
        targetDate: new Date("2026-12-31T00:00:00.000Z").toISOString()
      }
    });
    expect(createResponse.statusCode).toBe(200);
    const created = parseJson(createResponse.json(), z.object({ item: goalItemSchema }).strict());

    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/v1/goals/${created.item.id}`,
      headers: { authorization: `Bearer ${auth.token}` },
      payload: {
        currentAmount: 3500
      }
    });
    expect(updateResponse.statusCode).toBe(200);
    parseJson(updateResponse.json(), z.object({ item: goalItemSchema }).strict());

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/goals/${created.item.id}`,
      headers: { authorization: `Bearer ${auth.token}` }
    });
    expect(deleteResponse.statusCode).toBe(200);
    parseJson(deleteResponse.json(), successSchema);

    const deleteAgainResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/goals/${created.item.id}`,
      headers: { authorization: `Bearer ${auth.token}` }
    });
    expect(deleteAgainResponse.statusCode).toBe(404);
    const notFound = parseJson(deleteAgainResponse.json(), errorEnvelopeSchema);
    expect(notFound.error.code).toBe("GOAL_NOT_FOUND");
  });
});
