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

describe("budgets + goals integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("supports budget CRUD with spent aggregation and isolation", async () => {
    const userA = await authViaOtp(app, `budget-alpha-${randomUUID()}@example.com`);
    const userB = await authViaOtp(app, `budget-beta-${randomUUID()}@example.com`);

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

    const month = "2026-03";

    const createBudgetResponse = await app.inject({
      method: "POST",
      url: "/api/v1/budgets",
      headers: {
        authorization: `Bearer ${userA.token}`
      },
      payload: {
        categoryId: debitCategory?.id,
        month,
        amount: 2000,
        currency: "INR"
      }
    });

    expect(createBudgetResponse.statusCode).toBe(200);
    const budgetId = (createBudgetResponse.json() as { item: { id: string } }).item.id;

    const createTransactionResponse = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: {
        authorization: `Bearer ${userA.token}`
      },
      payload: {
        direction: "debit",
        amount: 500,
        currency: "INR",
        categoryId: debitCategory?.id,
        counterparty: "Grocery Store",
        note: "Weekly shopping",
        occurredAt: "2026-03-12T08:30:00.000Z"
      }
    });

    expect(createTransactionResponse.statusCode).toBe(200);

    const listBudgetResponse = await app.inject({
      method: "GET",
      url: `/api/v1/budgets?month=${month}`,
      headers: {
        authorization: `Bearer ${userA.token}`
      }
    });

    expect(listBudgetResponse.statusCode).toBe(200);
    const listBudgetJson = listBudgetResponse.json() as {
      items: Array<{ id: string; spentAmount: number; remainingAmount: number }>;
    };

    const budget = listBudgetJson.items.find((item) => item.id === budgetId);
    expect(budget).toBeDefined();
    expect(budget?.spentAmount).toBe(500);
    expect(budget?.remainingAmount).toBe(1500);

    const updateBudgetResponse = await app.inject({
      method: "PATCH",
      url: `/api/v1/budgets/${budgetId}`,
      headers: {
        authorization: `Bearer ${userA.token}`
      },
      payload: {
        amount: 2200
      }
    });

    expect(updateBudgetResponse.statusCode).toBe(200);

    const crossUserUpdateResponse = await app.inject({
      method: "PATCH",
      url: `/api/v1/budgets/${budgetId}`,
      headers: {
        authorization: `Bearer ${userB.token}`
      },
      payload: {
        amount: 999
      }
    });

    expect(crossUserUpdateResponse.statusCode).toBe(404);

    const deleteBudgetResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/budgets/${budgetId}`,
      headers: {
        authorization: `Bearer ${userA.token}`
      }
    });

    expect(deleteBudgetResponse.statusCode).toBe(200);
  });

  it("supports goals CRUD and user isolation", async () => {
    const userA = await authViaOtp(app, `goal-alpha-${randomUUID()}@example.com`);
    const userB = await authViaOtp(app, `goal-beta-${randomUUID()}@example.com`);

    const createGoalResponse = await app.inject({
      method: "POST",
      url: "/api/v1/goals",
      headers: {
        authorization: `Bearer ${userA.token}`
      },
      payload: {
        name: "Emergency Fund",
        targetAmount: 50000,
        currentAmount: 10000,
        currency: "INR",
        targetDate: "2026-12-31T00:00:00.000Z"
      }
    });

    expect(createGoalResponse.statusCode).toBe(200);
    const goalId = (createGoalResponse.json() as { item: { id: string } }).item.id;

    const listGoalsResponse = await app.inject({
      method: "GET",
      url: "/api/v1/goals",
      headers: {
        authorization: `Bearer ${userA.token}`
      }
    });

    expect(listGoalsResponse.statusCode).toBe(200);
    const listGoalsJson = listGoalsResponse.json() as { items: Array<{ id: string }> };
    expect(listGoalsJson.items.some((goal) => goal.id === goalId)).toBe(true);

    const updateGoalResponse = await app.inject({
      method: "PATCH",
      url: `/api/v1/goals/${goalId}`,
      headers: {
        authorization: `Bearer ${userA.token}`
      },
      payload: {
        currentAmount: 20000
      }
    });

    expect(updateGoalResponse.statusCode).toBe(200);

    const crossUserDeleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/goals/${goalId}`,
      headers: {
        authorization: `Bearer ${userB.token}`
      }
    });

    expect(crossUserDeleteResponse.statusCode).toBe(404);

    const deleteGoalResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/goals/${goalId}`,
      headers: {
        authorization: `Bearer ${userA.token}`
      }
    });

    expect(deleteGoalResponse.statusCode).toBe(200);
  });
});
