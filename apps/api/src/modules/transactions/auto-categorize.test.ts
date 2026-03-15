import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import { suggestCategoryIdForTransaction } from "./auto-categorize.js";

// ---------------------------------------------------------------------------
// Mock DB builder
// ---------------------------------------------------------------------------
// The DB returned by createMockDb is a chainable query builder mock.
// Calls are stored so individual tests can override return values.
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

const createSelectChain = (rows: Row[]) => {
  const chain = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => Promise.resolve(rows),
    groupBy: () => chain
  };
  return chain;
};

const createMockDb = () => {
  const selectSpy = vi.fn();

  const db = {
    select: selectSpy
  };

  return { db, selectSpy };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FOOD_ID = "cat-food-id";
const TRANSPORT_ID = "cat-transport-id";
const SHOPPING_ID = "cat-shopping-id";
const SALARY_ID = "cat-salary-id";
const BILLS_ID = "cat-bills-id";
const TRANSFER_ID = "cat-transfer-id";

describe("suggestCategoryIdForTransaction", () => {
  let db: ReturnType<typeof createMockDb>["db"];
  let selectSpy: ReturnType<typeof createMockDb>["selectSpy"];

  beforeEach(() => {
    const mocks = createMockDb();
    db = mocks.db;
    selectSpy = mocks.selectSpy;
  });

  // -------------------------------------------------------------------------
  // Transfer direction
  // -------------------------------------------------------------------------

  it("transfer direction always resolves to the Transfer category via name lookup", async () => {
    // First select: history inference (returns empty — skipped for transfer)
    // Only select called is for resolving 'Transfer' category by name
    selectSpy.mockReturnValueOnce(createSelectChain([{ id: TRANSFER_ID, userId: null }]));

    const result = await suggestCategoryIdForTransaction({
      db: db as never,
      userId: "user-1",
      direction: "transfer",
      counterparty: "Some Bank",
      note: "funds transfer"
    });

    expect(result).toBe(TRANSFER_ID);
    // For transfer, history inference is skipped — only one DB call for name resolution
    expect(selectSpy).toHaveBeenCalledTimes(1);
  });

  it("transfer direction returns null when no Transfer category exists in DB", async () => {
    selectSpy.mockReturnValueOnce(createSelectChain([]));

    const result = await suggestCategoryIdForTransaction({
      db: db as never,
      userId: "user-1",
      direction: "transfer",
      counterparty: null,
      note: null
    });

    expect(result).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Keyword rules — counterparty matching
  // -------------------------------------------------------------------------

  it('counterparty "Swiggy" resolves to Food & Dining category', async () => {
    // First select: history inference — no prior category for this counterparty
    selectSpy.mockReturnValueOnce(createSelectChain([]));
    // Second select: keyword rule resolves Food & Dining
    selectSpy.mockReturnValueOnce(createSelectChain([{ id: FOOD_ID, userId: null }]));

    const result = await suggestCategoryIdForTransaction({
      db: db as never,
      userId: "user-1",
      direction: "debit",
      counterparty: "Swiggy",
      note: null
    });

    expect(result).toBe(FOOD_ID);
  });

  it('counterparty "Uber" resolves to Transport category', async () => {
    selectSpy.mockReturnValueOnce(createSelectChain([]));
    selectSpy.mockReturnValueOnce(createSelectChain([{ id: TRANSPORT_ID, userId: null }]));

    const result = await suggestCategoryIdForTransaction({
      db: db as never,
      userId: "user-1",
      direction: "debit",
      counterparty: "Uber",
      note: null
    });

    expect(result).toBe(TRANSPORT_ID);
  });

  it('counterparty "Amazon" resolves to Shopping category', async () => {
    selectSpy.mockReturnValueOnce(createSelectChain([]));
    selectSpy.mockReturnValueOnce(createSelectChain([{ id: SHOPPING_ID, userId: null }]));

    const result = await suggestCategoryIdForTransaction({
      db: db as never,
      userId: "user-1",
      direction: "debit",
      counterparty: "Amazon",
      note: null
    });

    expect(result).toBe(SHOPPING_ID);
  });

  // -------------------------------------------------------------------------
  // Keyword rules — note matching
  // -------------------------------------------------------------------------

  it('note "salary credit" resolves to Salary category (credit direction)', async () => {
    // counterparty is null → normalized to "" → history inference exits early (no DB call)
    // One DB call: resolveCategoryByName for Salary
    selectSpy.mockReturnValueOnce(createSelectChain([{ id: SALARY_ID, userId: null }]));

    const result = await suggestCategoryIdForTransaction({
      db: db as never,
      userId: "user-1",
      direction: "credit",
      counterparty: null,
      note: "salary credit"
    });

    expect(result).toBe(SALARY_ID);
  });

  it('note "electricity bill" resolves to Bills category', async () => {
    // counterparty is null → normalized to "" → inferFromCounterpartyHistory returns null immediately (no DB call)
    // Only one DB call: resolveCategoryByName for Bills
    selectSpy.mockReturnValueOnce(createSelectChain([{ id: BILLS_ID, userId: null }]));

    const result = await suggestCategoryIdForTransaction({
      db: db as never,
      userId: "user-1",
      direction: "debit",
      counterparty: null,
      note: "electricity bill payment"
    });

    expect(result).toBe(BILLS_ID);
  });

  // -------------------------------------------------------------------------
  // Unknown counterparty + no keywords
  // -------------------------------------------------------------------------

  it("unknown counterparty with no keyword match returns null", async () => {
    // History inference: no match
    selectSpy.mockReturnValueOnce(createSelectChain([]));
    // Keyword rule: no match — category resolution returns empty
    // (inferFromKeywordRules returns null before reaching DB when there's no matching rule)

    const result = await suggestCategoryIdForTransaction({
      db: db as never,
      userId: "user-1",
      direction: "debit",
      counterparty: "RandomUnknownMerchantXYZ",
      note: "misc purchase"
    });

    expect(result).toBeNull();
  });

  it("null counterparty and null note returns null", async () => {
    selectSpy.mockReturnValueOnce(createSelectChain([]));

    const result = await suggestCategoryIdForTransaction({
      db: db as never,
      userId: "user-1",
      direction: "debit",
      counterparty: null,
      note: null
    });

    expect(result).toBeNull();
  });

  it("empty string counterparty and empty note returns null", async () => {
    selectSpy.mockReturnValueOnce(createSelectChain([]));

    const result = await suggestCategoryIdForTransaction({
      db: db as never,
      userId: "user-1",
      direction: "debit",
      counterparty: "",
      note: ""
    });

    expect(result).toBeNull();
  });

  // -------------------------------------------------------------------------
  // History inference
  // -------------------------------------------------------------------------

  it("same counterparty previously categorized — returns that category from history", async () => {
    const PREVIOUSLY_USED_CATEGORY = "cat-previously-used-id";

    // History inference returns a match — category resolution not reached
    selectSpy.mockReturnValueOnce(
      createSelectChain([
        {
          categoryId: PREVIOUSLY_USED_CATEGORY,
          occurrences: 3,
          latestOccurredAt: new Date()
        }
      ])
    );

    const result = await suggestCategoryIdForTransaction({
      db: db as never,
      userId: "user-1",
      direction: "debit",
      counterparty: "Landlord PVT LTD",
      note: "monthly rent"
    });

    expect(result).toBe(PREVIOUSLY_USED_CATEGORY);
    // When history returns a match, keyword lookup is skipped — only one DB call
    expect(selectSpy).toHaveBeenCalledTimes(1);
  });

  it("history inference takes precedence over keyword rules", async () => {
    const HISTORY_CATEGORY = "cat-history-override-id";

    // Even though "Swiggy" matches Food & Dining keywords, if history says otherwise, history wins
    selectSpy.mockReturnValueOnce(
      createSelectChain([
        {
          categoryId: HISTORY_CATEGORY,
          occurrences: 5,
          latestOccurredAt: new Date()
        }
      ])
    );

    const result = await suggestCategoryIdForTransaction({
      db: db as never,
      userId: "user-1",
      direction: "debit",
      counterparty: "Swiggy",
      note: null
    });

    expect(result).toBe(HISTORY_CATEGORY);
    // Only history select — keyword resolution not called
    expect(selectSpy).toHaveBeenCalledTimes(1);
  });

  it("history inference with empty counterparty falls through to keyword matching", async () => {
    // Empty counterparty → normalizeValue("") === "" → inferFromCounterpartyHistory returns null immediately (no DB call)
    // Keyword matching on the combined text "zomato dinner" matches Food & Dining
    // One DB call: resolveCategoryByName for Food & Dining
    selectSpy.mockReturnValueOnce(createSelectChain([{ id: FOOD_ID, userId: null }]));

    const result = await suggestCategoryIdForTransaction({
      db: db as never,
      userId: "user-1",
      direction: "debit",
      counterparty: "",
      note: "zomato dinner"
    });

    expect(result).toBe(FOOD_ID);
  });

  // -------------------------------------------------------------------------
  // Case insensitivity
  // -------------------------------------------------------------------------

  it('counterparty "SWIGGY" (uppercase) still matches Food & Dining', async () => {
    selectSpy.mockReturnValueOnce(createSelectChain([]));
    selectSpy.mockReturnValueOnce(createSelectChain([{ id: FOOD_ID, userId: null }]));

    const result = await suggestCategoryIdForTransaction({
      db: db as never,
      userId: "user-1",
      direction: "debit",
      counterparty: "SWIGGY",
      note: null
    });

    expect(result).toBe(FOOD_ID);
  });

  // -------------------------------------------------------------------------
  // User-specific category preference
  // -------------------------------------------------------------------------

  it("user-specific category is preferred over default (null userId) category", async () => {
    const USER_SPECIFIC_FOOD_ID = "cat-user-food-id";
    const DEFAULT_FOOD_ID = "cat-default-food-id";

    // History: no match
    selectSpy.mockReturnValueOnce(createSelectChain([]));
    // Category lookup returns user-specific first
    selectSpy.mockReturnValueOnce(
      createSelectChain([
        { id: DEFAULT_FOOD_ID, userId: null },
        { id: USER_SPECIFIC_FOOD_ID, userId: "user-1" }
      ])
    );

    const result = await suggestCategoryIdForTransaction({
      db: db as never,
      userId: "user-1",
      direction: "debit",
      counterparty: "Swiggy",
      note: null
    });

    expect(result).toBe(USER_SPECIFIC_FOOD_ID);
  });
});

// ---------------------------------------------------------------------------
// Integration-style tests using real DB (via Fastify app inject)
// ---------------------------------------------------------------------------

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

describe("auto-categorize — integration (real DB)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("counterparty history: second Swiggy transaction auto-suggests Food & Dining", async () => {
    const user = await authViaOtp(app, `autocat-history-${randomUUID()}@example.com`);

    // Fetch categories to find the Food & Dining category id
    const categoriesResponse = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
      headers: { authorization: `Bearer ${user.token}` }
    });
    expect(categoriesResponse.statusCode).toBe(200);
    const categoriesJson = categoriesResponse.json() as {
      items: Array<{ id: string; name: string; direction: string }>;
    };
    const foodCategory = categoriesJson.items.find(
      (item) => item.direction === "debit" && item.name.toLowerCase().includes("food")
    );
    expect(foodCategory).toBeDefined();

    // First transaction: manually categorize as Food & Dining with counterparty "Swiggy"
    const firstTx = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: { authorization: `Bearer ${user.token}` },
      payload: {
        direction: "debit",
        amount: 250,
        currency: "INR",
        categoryId: foodCategory!.id,
        counterparty: "Swiggy",
        occurredAt: "2026-03-01T12:00:00.000Z"
      }
    });
    expect(firstTx.statusCode).toBe(200);

    // Second transaction: same counterparty, no explicit category — auto-categorize should suggest Food & Dining
    const secondTx = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: { authorization: `Bearer ${user.token}` },
      payload: {
        direction: "debit",
        amount: 350,
        currency: "INR",
        counterparty: "Swiggy",
        occurredAt: "2026-03-05T18:00:00.000Z"
      }
    });
    expect(secondTx.statusCode).toBe(200);
    const secondTxJson = secondTx.json() as { item: { categoryId: string | null } };

    // The category should be auto-suggested as Food & Dining (via counterparty history)
    expect(secondTxJson.item.categoryId).toBe(foodCategory!.id);
  });

  it("keyword rule is used when no counterparty history exists", async () => {
    const user = await authViaOtp(app, `autocat-keyword-${randomUUID()}@example.com`);

    const categoriesResponse = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
      headers: { authorization: `Bearer ${user.token}` }
    });
    const categoriesJson = categoriesResponse.json() as {
      items: Array<{ id: string; name: string; direction: string }>;
    };
    const foodCategory = categoriesJson.items.find(
      (item) => item.direction === "debit" && item.name.toLowerCase().includes("food")
    );
    expect(foodCategory).toBeDefined();

    // Fresh user — no history. Counterparty "Swiggy" matches the keyword rule for Food & Dining.
    const tx = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: { authorization: `Bearer ${user.token}` },
      payload: {
        direction: "debit",
        amount: 180,
        currency: "INR",
        counterparty: "Swiggy",
        occurredAt: "2026-03-02T20:00:00.000Z"
      }
    });
    expect(tx.statusCode).toBe(200);
    const txJson = tx.json() as { item: { categoryId: string | null } };

    // Keyword rule should assign Food & Dining
    expect(txJson.item.categoryId).toBe(foodCategory!.id);
  });

  it("counterparty history takes lower priority than a different existing history entry (history wins over keyword)", async () => {
    const user = await authViaOtp(app, `autocat-priority-${randomUUID()}@example.com`);

    const categoriesResponse = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
      headers: { authorization: `Bearer ${user.token}` }
    });
    const categoriesJson = categoriesResponse.json() as {
      items: Array<{ id: string; name: string; direction: string }>;
    };

    // Use a non-food debit category to override the Swiggy keyword rule via history
    const nonFoodCategory = categoriesJson.items.find(
      (item) => item.direction === "debit" && !item.name.toLowerCase().includes("food")
    );
    expect(nonFoodCategory).toBeDefined();

    // First transaction: Swiggy manually categorized as non-food category
    const firstTx = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: { authorization: `Bearer ${user.token}` },
      payload: {
        direction: "debit",
        amount: 500,
        currency: "INR",
        categoryId: nonFoodCategory!.id,
        counterparty: "Swiggy",
        occurredAt: "2026-03-01T10:00:00.000Z"
      }
    });
    expect(firstTx.statusCode).toBe(200);

    // Second transaction: Swiggy without explicit category
    // History should win over the "Food & Dining" keyword rule
    const secondTx = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: { authorization: `Bearer ${user.token}` },
      payload: {
        direction: "debit",
        amount: 200,
        currency: "INR",
        counterparty: "Swiggy",
        occurredAt: "2026-03-10T12:00:00.000Z"
      }
    });
    expect(secondTx.statusCode).toBe(200);
    const secondTxJson = secondTx.json() as { item: { categoryId: string | null } };

    // History (non-food) takes lower priority than… wait — history is HIGHER priority.
    // The test verifies: counterparty history OVERRIDES keyword rule.
    // nonFoodCategory should be suggested, not the keyword-matched food category.
    expect(secondTxJson.item.categoryId).toBe(nonFoodCategory!.id);
  });
});
