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

  it("supports custom categories and auto-categorization rules", async () => {
    const user = await authViaOtp(app, `categories-${randomUUID()}@example.com`);

    const initialCategoriesResponse = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
      headers: {
        authorization: `Bearer ${user.token}`
      }
    });

    expect(initialCategoriesResponse.statusCode).toBe(200);
    const initialCategoriesJson = initialCategoriesResponse.json() as {
      items: Array<{ id: string; name: string; direction: "debit" | "credit" | "transfer"; isDefault: boolean }>;
    };

    const foodCategoryId = initialCategoriesJson.items.find((item) => item.name === "Food & Dining" && item.direction === "debit")?.id;
    const defaultDebitCategoryId = initialCategoriesJson.items.find((item) => item.isDefault && item.direction === "debit")?.id;

    expect(foodCategoryId).toBeTruthy();
    expect(defaultDebitCategoryId).toBeTruthy();

    const createCategory = await app.inject({
      method: "POST",
      url: "/api/v1/categories",
      headers: {
        authorization: `Bearer ${user.token}`
      },
      payload: {
        name: "Rent",
        direction: "debit"
      }
    });

    expect(createCategory.statusCode).toBe(200);
    const createdCategory = createCategory.json() as {
      item: { id: string; name: string; direction: "debit" | "credit" | "transfer"; isDefault: boolean };
    };
    expect(createdCategory.item.name).toBe("Rent");
    expect(createdCategory.item.isDefault).toBe(false);

    const duplicateCategory = await app.inject({
      method: "POST",
      url: "/api/v1/categories",
      headers: {
        authorization: `Bearer ${user.token}`
      },
      payload: {
        name: "rent",
        direction: "debit"
      }
    });

    expect(duplicateCategory.statusCode).toBe(409);

    const renameCategory = await app.inject({
      method: "PATCH",
      url: `/api/v1/categories/${createdCategory.item.id}`,
      headers: {
        authorization: `Bearer ${user.token}`
      },
      payload: {
        name: "House Rent"
      }
    });

    expect(renameCategory.statusCode).toBe(200);

    const updateDefaultAttempt = await app.inject({
      method: "PATCH",
      url: `/api/v1/categories/${defaultDebitCategoryId}`,
      headers: {
        authorization: `Bearer ${user.token}`
      },
      payload: {
        name: "Cannot Edit"
      }
    });

    expect(updateDefaultAttempt.statusCode).toBe(404);

    const anchorTransaction = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: {
        authorization: `Bearer ${user.token}`
      },
      payload: {
        direction: "debit",
        amount: 12000,
        currency: "INR",
        categoryId: createdCategory.item.id,
        counterparty: "Landlord PVT LTD",
        note: "monthly rent",
        occurredAt: "2026-03-01T06:30:00.000Z"
      }
    });

    expect(anchorTransaction.statusCode).toBe(200);

    const learnedTransaction = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: {
        authorization: `Bearer ${user.token}`
      },
      payload: {
        direction: "debit",
        amount: 11500,
        currency: "INR",
        counterparty: "Landlord PVT LTD",
        note: "month two",
        occurredAt: "2026-03-05T07:30:00.000Z"
      }
    });

    expect(learnedTransaction.statusCode).toBe(200);
    const learnedTransactionJson = learnedTransaction.json() as { item: { categoryId: string | null } };
    expect(learnedTransactionJson.item.categoryId).toBe(createdCategory.item.id);

    const keywordTransaction = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: {
        authorization: `Bearer ${user.token}`
      },
      payload: {
        direction: "debit",
        amount: 560,
        currency: "INR",
        counterparty: "Zomato",
        note: "dinner order",
        occurredAt: "2026-03-05T10:00:00.000Z"
      }
    });

    expect(keywordTransaction.statusCode).toBe(200);
    const keywordJson = keywordTransaction.json() as { item: { categoryId: string | null } };
    expect(keywordJson.item.categoryId).toBe(foodCategoryId);

    const budgetAgainstCategory = await app.inject({
      method: "POST",
      url: "/api/v1/budgets",
      headers: {
        authorization: `Bearer ${user.token}`
      },
      payload: {
        categoryId: createdCategory.item.id,
        month: "2026-03",
        amount: 20000,
        currency: "INR"
      }
    });

    expect(budgetAgainstCategory.statusCode).toBe(200);

    const deleteBlockedCategory = await app.inject({
      method: "DELETE",
      url: `/api/v1/categories/${createdCategory.item.id}`,
      headers: {
        authorization: `Bearer ${user.token}`
      }
    });

    expect(deleteBlockedCategory.statusCode).toBe(409);

    const removableCategory = await app.inject({
      method: "POST",
      url: "/api/v1/categories",
      headers: {
        authorization: `Bearer ${user.token}`
      },
      payload: {
        name: "Freelance",
        direction: "credit"
      }
    });

    expect(removableCategory.statusCode).toBe(200);
    const removableCategoryId = (removableCategory.json() as { item: { id: string } }).item.id;

    const deleteCategory = await app.inject({
      method: "DELETE",
      url: `/api/v1/categories/${removableCategoryId}`,
      headers: {
        authorization: `Bearer ${user.token}`
      }
    });

    expect(deleteCategory.statusCode).toBe(200);
  });

  it("supports recovery OTP aliases and account deletion", async () => {
    const email = `recovery-${randomUUID()}@example.com`;

    const recoveryRequest = await app.inject({
      method: "POST",
      url: "/api/v1/auth/recovery/request-otp",
      payload: { email }
    });

    expect(recoveryRequest.statusCode).toBe(200);
    const recoveryRequestJson = recoveryRequest.json() as { debugOtpCode?: string };
    expect(recoveryRequestJson.debugOtpCode).toBeTruthy();

    const recoveryVerify = await app.inject({
      method: "POST",
      url: "/api/v1/auth/recovery/verify-otp",
      payload: {
        email,
        code: recoveryRequestJson.debugOtpCode
      }
    });

    expect(recoveryVerify.statusCode).toBe(200);
    const recoveryVerifyJson = recoveryVerify.json() as { token: string };

    const deleteAccountResponse = await app.inject({
      method: "DELETE",
      url: "/api/v1/account",
      headers: {
        authorization: `Bearer ${recoveryVerifyJson.token}`
      }
    });

    expect(deleteAccountResponse.statusCode).toBe(200);

    const meAfterDelete = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: {
        authorization: `Bearer ${recoveryVerifyJson.token}`
      }
    });

    expect(meAfterDelete.statusCode).toBe(401);
  });
});
