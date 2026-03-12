import { describe, expect, it } from "vitest";
import { isValidMonthToken, shiftMonthToken } from "./month";

describe("month helpers", () => {
  it("validates YYYY-MM month tokens", () => {
    expect(isValidMonthToken("2026-03")).toBe(true);
    expect(isValidMonthToken("2026-13")).toBe(false);
    expect(isValidMonthToken("26-03")).toBe(false);
  });

  it("shifts month tokens across year boundaries", () => {
    expect(shiftMonthToken("2026-01", -1)).toBe("2025-12");
    expect(shiftMonthToken("2026-12", 1)).toBe("2027-01");
    expect(shiftMonthToken("2026-03", 2)).toBe("2026-05");
  });

  it("throws for invalid month token", () => {
    expect(() => shiftMonthToken("2026/03", 1)).toThrow();
  });
});
