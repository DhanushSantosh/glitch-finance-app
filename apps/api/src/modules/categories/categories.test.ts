import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Extracted helpers under test
//
// normalizeCategoryName and findDuplicateCategory live in routes.ts but are
// not exported. We test them via the integration layer (inject) for
// findDuplicateCategory, and directly re-implement the pure logic for
// normalizeCategoryName unit tests.
//
// For pure unit coverage of the normalization function we mirror the
// implementation here; the integration tests below exercise findDuplicateCategory
// end-to-end via the category create/update endpoints.
// ---------------------------------------------------------------------------

// Mirrored from routes.ts — pure function, no DB dependency
const normalizeCategoryName = (value: string): string => value.trim().replace(/\s+/g, " ");

describe("normalizeCategoryName", () => {
  it("trims leading whitespace", () => {
    expect(normalizeCategoryName("  Groceries")).toBe("Groceries");
  });

  it("trims trailing whitespace", () => {
    expect(normalizeCategoryName("Groceries  ")).toBe("Groceries");
  });

  it("trims both leading and trailing whitespace", () => {
    expect(normalizeCategoryName("  Groceries  ")).toBe("Groceries");
  });

  it("collapses multiple internal spaces into a single space", () => {
    expect(normalizeCategoryName("Food  &  Dining")).toBe("Food & Dining");
  });

  it("collapses tabs between words", () => {
    expect(normalizeCategoryName("Food\t&\tDining")).toBe("Food & Dining");
  });

  it("collapses newlines between words", () => {
    expect(normalizeCategoryName("Food\n&\nDining")).toBe("Food & Dining");
  });

  it("handles a single word with no surrounding whitespace unchanged", () => {
    expect(normalizeCategoryName("Salary")).toBe("Salary");
  });

  it("returns empty string when given an empty string", () => {
    expect(normalizeCategoryName("")).toBe("");
  });

  it("returns a single space normalized to empty (trim removes it)", () => {
    expect(normalizeCategoryName("  ")).toBe("");
  });

  it("preserves internal single space", () => {
    expect(normalizeCategoryName("Food & Dining")).toBe("Food & Dining");
  });
});

// ---------------------------------------------------------------------------
// findDuplicateCategory — integration-style via HTTP endpoints
// ---------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll } from "vitest";
import { createApp } from "../../app.js";

type AuthResult = { token: string; userId: string };

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
  return { token: verifyJson.token, userId: verifyJson.user.id };
};

describe("findDuplicateCategory (via category endpoints)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 409 when creating a category with the same name and direction (case-insensitive)", async () => {
    const user = await authViaOtp(app, `cat-dup-${randomUUID()}@example.com`);

    // Create first category
    const firstResponse = await app.inject({
      method: "POST",
      url: "/api/v1/categories",
      headers: { authorization: `Bearer ${user.token}` },
      payload: { name: "My Expense", direction: "debit" }
    });
    expect(firstResponse.statusCode).toBe(200);

    // Same name, same direction — must conflict
    const duplicateResponse = await app.inject({
      method: "POST",
      url: "/api/v1/categories",
      headers: { authorization: `Bearer ${user.token}` },
      payload: { name: "My Expense", direction: "debit" }
    });
    expect(duplicateResponse.statusCode).toBe(409);
    const errorJson = duplicateResponse.json() as { error: { code: string } };
    expect(errorJson.error.code).toBe("CATEGORY_NAME_CONFLICT");
  });

  it("returns 409 when creating a category with the same name in different case and same direction", async () => {
    const user = await authViaOtp(app, `cat-dup-case-${randomUUID()}@example.com`);

    const firstResponse = await app.inject({
      method: "POST",
      url: "/api/v1/categories",
      headers: { authorization: `Bearer ${user.token}` },
      payload: { name: "Utilities", direction: "debit" }
    });
    expect(firstResponse.statusCode).toBe(200);

    // Uppercase variant — still a duplicate by case-insensitive match
    const duplicateResponse = await app.inject({
      method: "POST",
      url: "/api/v1/categories",
      headers: { authorization: `Bearer ${user.token}` },
      payload: { name: "UTILITIES", direction: "debit" }
    });
    expect(duplicateResponse.statusCode).toBe(409);
  });

  it("returns 200 when same name but different direction — not a duplicate", async () => {
    const user = await authViaOtp(app, `cat-diff-dir-${randomUUID()}@example.com`);

    const debitResponse = await app.inject({
      method: "POST",
      url: "/api/v1/categories",
      headers: { authorization: `Bearer ${user.token}` },
      payload: { name: "Transfers", direction: "debit" }
    });
    expect(debitResponse.statusCode).toBe(200);

    // Same name, different direction — should succeed
    const creditResponse = await app.inject({
      method: "POST",
      url: "/api/v1/categories",
      headers: { authorization: `Bearer ${user.token}` },
      payload: { name: "Transfers", direction: "credit" }
    });
    expect(creditResponse.statusCode).toBe(200);
  });

  it("normalizeCategoryName: extra whitespace is collapsed before duplicate check", async () => {
    const user = await authViaOtp(app, `cat-ws-norm-${randomUUID()}@example.com`);

    // Create with extra internal whitespace (normalized to "My Budget")
    const firstResponse = await app.inject({
      method: "POST",
      url: "/api/v1/categories",
      headers: { authorization: `Bearer ${user.token}` },
      payload: { name: "My  Budget", direction: "debit" }
    });
    expect(firstResponse.statusCode).toBe(200);
    const firstJson = firstResponse.json() as { item: { name: string } };
    // Stored name is normalized
    expect(firstJson.item.name).toBe("My Budget");

    // Attempting to create the normalized form directly must conflict
    const duplicateResponse = await app.inject({
      method: "POST",
      url: "/api/v1/categories",
      headers: { authorization: `Bearer ${user.token}` },
      payload: { name: "My Budget", direction: "debit" }
    });
    expect(duplicateResponse.statusCode).toBe(409);
  });
});
