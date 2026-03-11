import { describe, expect, it } from "vitest";
import { calculateOtpExpiry, isOtpAttemptAllowed, isOtpExpired } from "./otp-policy.js";

describe("otp-policy", () => {
  it("calculates expiry from a base timestamp", () => {
    const now = new Date("2026-03-11T10:00:00.000Z");
    const expiry = calculateOtpExpiry(now, 300);

    expect(expiry.toISOString()).toBe("2026-03-11T10:05:00.000Z");
  });

  it("marks otp as expired only after expiry timestamp", () => {
    const expiry = new Date("2026-03-11T10:05:00.000Z");

    expect(isOtpExpired(expiry, new Date("2026-03-11T10:04:59.000Z"))).toBe(false);
    expect(isOtpExpired(expiry, new Date("2026-03-11T10:05:01.000Z"))).toBe(true);
  });

  it("enforces max attempts", () => {
    expect(isOtpAttemptAllowed(0, 5)).toBe(true);
    expect(isOtpAttemptAllowed(4, 5)).toBe(true);
    expect(isOtpAttemptAllowed(5, 5)).toBe(false);
  });
});
