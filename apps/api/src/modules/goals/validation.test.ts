import { describe, expect, it } from "vitest";
import { goalCreateSchema, goalUpdateSchema } from "./validation.js";

describe("goals validation", () => {
  it("validates create payload", () => {
    const payload = goalCreateSchema.parse({
      name: "Emergency Fund",
      targetAmount: 25000,
      currentAmount: 1500,
      currency: "INR"
    });

    expect(payload.targetAmount).toBe(25000);
    expect(payload.currentAmount).toBe(1500);
  });

  it("rejects empty update payload", () => {
    const parsed = goalUpdateSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });
});
