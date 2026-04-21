import { describe, expect, it } from "vitest";
import { isValidOtpSenderAddress } from "./provider.js";

describe("otp sender address validation", () => {
  it("accepts plain email sender addresses", () => {
    expect(isValidOtpSenderAddress("noreply@example.com")).toBe(true);
  });

  it("accepts display-name sender addresses", () => {
    expect(isValidOtpSenderAddress("Glitch Finance <noreply@example.com>")).toBe(true);
  });

  it("rejects malformed sender addresses", () => {
    expect(isValidOtpSenderAddress("Glitch Finance noreply@example.com")).toBe(false);
    expect(isValidOtpSenderAddress("Glitch Finance <noreply@example>")).toBe(false);
    expect(isValidOtpSenderAddress("")).toBe(false);
  });
});
