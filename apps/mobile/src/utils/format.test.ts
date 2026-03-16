import { describe, expect, it } from "vitest";
import { formatDateOnly, formatDateTime, formatDateToken, formatMoney, isNonEmpty } from "./format";

describe("format helpers", () => {
  it("formats money using locale-aware currency rules", () => {
    const inrValue = formatMoney(123.4, "INR", { locale: "en-IN" });
    const usdValue = formatMoney(55, "USD", { locale: "en-US" });

    expect(inrValue).toContain("₹");
    expect(inrValue).toContain("123.40");
    expect(usdValue).toContain("55.00");
  });

  it("formats date token for readable month/day", () => {
    expect(formatDateToken("2026-03-12", { locale: "en-US" })).toContain("12");
  });

  it("formats date/time with timezone preference", () => {
    const formatted = formatDateTime("2026-03-12T08:30:00.000Z", {
      locale: "en-US",
      timezone: "Asia/Kolkata"
    });

    expect(formatted).toContain("Mar");
  });

  it("formats date-only values with timezone preference", () => {
    const formatted = formatDateOnly("2026-03-12T08:30:00.000Z", {
      locale: "en-US",
      timezone: "Asia/Kolkata"
    });

    expect(formatted).toContain("2026");
  });

  it("checks non-empty values safely", () => {
    expect(isNonEmpty("value")).toBe(true);
    expect(isNonEmpty("   ")).toBe(false);
  });
});
