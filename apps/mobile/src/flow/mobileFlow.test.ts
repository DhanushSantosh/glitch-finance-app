import { describe, expect, it } from "vitest";
import { canSubmitTransaction, deriveAuthStage, resolveSmsIntentOutcome } from "./mobileFlow";

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
});
