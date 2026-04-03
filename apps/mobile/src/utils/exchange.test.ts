import { describe, expect, it } from "vitest";
import { buildMoneyDisplay, convertDisplayAmount, shouldShowConvertedAmount } from "./exchange";

const snapshot = {
  provider: "ecb",
  asOf: "2026-03-27",
  baseCurrency: "USD",
  rates: {
    USD: 1,
    INR: 91,
    EUR: 0.86
  }
};

describe("exchange helpers", () => {
  it("converts source amounts into the selected display currency", () => {
    expect(convertDisplayAmount(910, "INR", snapshot)).toBe(10);
    expect(convertDisplayAmount(10, "USD", snapshot)).toBe(10);
  });

  it("flags when a converted amount should show secondary context", () => {
    expect(shouldShowConvertedAmount("INR", snapshot)).toBe(true);
    expect(shouldShowConvertedAmount("USD", snapshot)).toBe(false);
  });

  it("builds a display payload with primary and secondary labels", () => {
    const display = buildMoneyDisplay(910, "INR", { locale: "en-US", timezone: "UTC", currency: "USD" }, snapshot);

    expect(display.currency).toBe("USD");
    expect(display.amount).toBe(10);
    expect(display.primaryLabel).toContain("$10.00");
    expect(display.secondaryLabel).toContain("₹910.00");
    expect(display.isConverted).toBe(true);
  });
});
