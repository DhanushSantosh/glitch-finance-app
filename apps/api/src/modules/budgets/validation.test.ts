import { describe, expect, it } from "vitest";
import { budgetCreateSchema, budgetUpdateSchema, getCurrentMonthToken, getMonthWindow } from "./validation.js";

describe("budgets validation", () => {
  it("validates create payload", () => {
    const payload = budgetCreateSchema.parse({
      categoryId: "123e4567-e89b-12d3-a456-426614174000",
      month: "2026-03",
      amount: 1500,
      currency: "INR"
    });

    expect(payload.amount).toBe(1500);
  });

  it("rejects empty update payload", () => {
    const parsed = budgetUpdateSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it("builds month windows", () => {
    const { start, end } = getMonthWindow("2026-03");
    expect(start.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });

  it("returns current month token shape", () => {
    expect(getCurrentMonthToken()).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });
});
