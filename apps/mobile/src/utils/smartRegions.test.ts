import { describe, expect, it } from "vitest";
import { countryOptions, getCityOptionsForCountry, getCountryByCode, getCountryCodeFromValue } from "./smartRegions";

describe("smart region datasets", () => {
  it("exposes a broad country list", () => {
    expect(countryOptions.length).toBeGreaterThan(200);
  });

  it("resolves country code from both name and code", () => {
    expect(getCountryCodeFromValue("India")).toBe("IN");
    expect(getCountryCodeFromValue("in")).toBe("IN");
  });

  it("returns normalized country regional defaults", () => {
    const india = getCountryByCode("IN");
    expect(india).not.toBeNull();
    expect(india?.currency).toBe("INR");
    expect(india?.timezone).toBe("Asia/Kolkata");
  });

  it("loads city options for selected country", () => {
    const indiaCities = getCityOptionsForCountry("IN");
    expect(indiaCities.length).toBeGreaterThan(100);
  });
});
