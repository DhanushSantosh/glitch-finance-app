import { describe, expect, it } from "vitest";
import { canSubmitTransaction, deriveAuthStage, getCurrentMonthToken, resolveSmsIntentOutcome } from "./mobileFlow";

describe("mobile flow helpers", () => {
  it("handles auth stage transitions", () => {
    expect(deriveAuthStage("", false)).toBe("login");
    expect(deriveAuthStage("user@example.com", false)).toBe("otp");
    expect(deriveAuthStage("", true)).toBe("authenticated");
  });

  it("keeps SMS disabled while recording user intent", () => {
    expect(resolveSmsIntentOutcome(true)).toEqual({
      requestedEnabled: true,
      enabled: false,
      featureAvailable: false
    });
  });

  it("validates transaction submission rules", () => {
    expect(canSubmitTransaction("150.25", "2026-03-11T18:35:00")).toBe(true);
    expect(canSubmitTransaction("0", "2026-03-11T18:35:00")).toBe(false);
    expect(canSubmitTransaction("200", "invalid-date")).toBe(false);
  });

  it("returns month token in YYYY-MM format", () => {
    expect(getCurrentMonthToken()).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });

  it("derives month token using provided timezone", () => {
    const fixedInstant = new Date("2026-03-01T00:30:00.000Z");

    expect(getCurrentMonthToken("Asia/Kolkata", fixedInstant)).toBe("2026-03");
    expect(getCurrentMonthToken("America/Los_Angeles", fixedInstant)).toBe("2026-02");
  });
});
