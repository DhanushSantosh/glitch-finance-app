import { describe, expect, it } from "vitest";
import { reportSummaryQuerySchema, resolveReportMonth } from "./validation.js";

describe("reports validation", () => {
  it("accepts month, currency, and top within range", () => {
    const parsed = reportSummaryQuerySchema.safeParse({
      month: "2026-03",
      currency: "INR",
      top: "5"
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.month).toBe("2026-03");
      expect(parsed.data.currency).toBe("INR");
      expect(parsed.data.top).toBe(5);
    }
  });

  it("rejects invalid month format", () => {
    const parsed = reportSummaryQuerySchema.safeParse({ month: "2026/03" });
    expect(parsed.success).toBe(false);
  });

  it("rejects top value above limit", () => {
    const parsed = reportSummaryQuerySchema.safeParse({ top: 20 });
    expect(parsed.success).toBe(false);
  });

  it("resolves current month when month is omitted", () => {
    const resolved = resolveReportMonth();
    expect(resolved).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });
});
