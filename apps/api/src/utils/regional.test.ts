import { describe, expect, it } from "vitest";
import {
  getCurrentMonthTokenForTimeZone,
  getMonthWindowForTimeZone,
  isSupportedCurrency,
  normalizeCurrency
} from "./regional.js";

describe("regional utils", () => {
  it("derives month tokens from timezone", () => {
    const fixedInstant = new Date("2026-03-01T00:30:00.000Z");
    expect(getCurrentMonthTokenForTimeZone("Asia/Kolkata", fixedInstant)).toBe("2026-03");
    expect(getCurrentMonthTokenForTimeZone("America/Los_Angeles", fixedInstant)).toBe("2026-02");
  });

  it("builds month windows in user timezone", () => {
    const kolkataWindow = getMonthWindowForTimeZone("2026-03", "Asia/Kolkata");
    expect(kolkataWindow.start.toISOString()).toBe("2026-02-28T18:30:00.000Z");
    expect(kolkataWindow.end.toISOString()).toBe("2026-03-31T18:30:00.000Z");
  });

  it("normalizes supported currency values", () => {
    expect(isSupportedCurrency("INR")).toBe(true);
    expect(normalizeCurrency("usd", "INR")).toBe("USD");
    expect(normalizeCurrency("invalid", "INR")).toBe("INR");
  });
});

