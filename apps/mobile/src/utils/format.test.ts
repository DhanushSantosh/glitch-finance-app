import { describe, expect, it } from "vitest";
import { formatDateToken, formatMoney, isNonEmpty } from "./format";

describe("format helpers", () => {
  it("formats INR and fallback currencies correctly", () => {
    expect(formatMoney(123.4, "INR")).toBe("₹123.40");
    expect(formatMoney(55, "usd")).toBe("USD 55.00");
  });

  it("formats date token for readable month/day", () => {
    expect(formatDateToken("2026-03-12")).toMatch(/Mar|12|\//);
  });

  it("checks non-empty values safely", () => {
    expect(isNonEmpty("value")).toBe(true);
    expect(isNonEmpty("   ")).toBe(false);
  });
});
