import { describe, expect, it } from "vitest";
import { listQuerySchema, normalizeTransactionPayload, transactionInputSchema, transactionUpdateSchema } from "./validation.js";

describe("transactions validation", () => {
  it("normalizes payload currency and amount format", () => {
    const normalized = normalizeTransactionPayload({
      direction: "debit",
      amount: 182.5,
      currency: "inr",
      occurredAt: new Date("2026-03-11T12:00:00.000Z")
    });

    expect(normalized.amount).toBe("182.50");
    expect(normalized.currency).toBe("INR");
  });

  it("accepts valid create payload", () => {
    const payload = transactionInputSchema.parse({
      direction: "credit",
      amount: "2200",
      currency: "INR",
      occurredAt: "2026-03-11T12:00:00.000Z"
    });

    expect(payload.direction).toBe("credit");
    expect(payload.amount).toBe(2200);
  });

  it("rejects empty update payload", () => {
    const result = transactionUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("applies list query defaults", () => {
    const query = listQuerySchema.parse({});
    expect(query.page).toBe(1);
    expect(query.pageSize).toBe(20);
    expect(query.sortBy).toBe("occurredAt");
    expect(query.sortOrder).toBe("desc");
  });

  it("accepts explicit sorting options", () => {
    const query = listQuerySchema.parse({
      sortBy: "amount",
      sortOrder: "asc"
    });

    expect(query.sortBy).toBe("amount");
    expect(query.sortOrder).toBe("asc");
  });
});
