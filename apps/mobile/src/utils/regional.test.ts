import { describe, expect, it } from "vitest";
import { getCurrentMonthTokenForTimeZone, resolveRegionalPreferences } from "./regional";
import { BootstrapPayload, UserProfile } from "../types";

const bootstrapFixture: BootstrapPayload = {
  appName: "Quantex25",
  currency: "INR",
  locale: "en-IN",
  timezone: "UTC",
  featureFlags: {
    smsImportEnabledByDefault: false,
    aiInsightsEnabled: false
  },
  legal: {
    smsDisclosureVersion: "sms_disclosure_v1"
  }
};

const profileFixture: UserProfile = {
  id: "a57bb06b-3c72-4ea5-a6ab-b1a9ec55d851",
  email: "regional@example.com",
  firstName: null,
  lastName: null,
  displayName: null,
  phoneNumber: null,
  dateOfBirth: null,
  avatarUrl: null,
  city: null,
  country: null,
  timezone: "Asia/Kolkata",
  locale: "en-IN",
  currency: "INR",
  occupation: null,
  bio: null,
  settings: {
    pushNotificationsEnabled: true,
    emailNotificationsEnabled: true,
    weeklySummaryEnabled: true,
    biometricsEnabled: false,
    marketingOptIn: false
  },
  createdAt: null,
  updatedAt: null
};

describe("regional helpers", () => {
  it("prefers profile settings over bootstrap defaults", () => {
    const preferences = resolveRegionalPreferences(profileFixture, bootstrapFixture);

    expect(preferences.locale).toBe("en-IN");
    expect(preferences.timezone).toBe("Asia/Kolkata");
    expect(preferences.currency).toBe("INR");
  });

  it("falls back to bootstrap defaults when profile is missing", () => {
    const preferences = resolveRegionalPreferences(null, bootstrapFixture);
    expect(preferences.locale).toBe("en-IN");
    expect(preferences.timezone).toBe("UTC");
    expect(preferences.currency).toBe("INR");
  });

  it("derives month token for timezone-sensitive boundaries", () => {
    const fixedInstant = new Date("2026-03-01T00:30:00.000Z");
    expect(getCurrentMonthTokenForTimeZone("Asia/Kolkata", fixedInstant)).toBe("2026-03");
    expect(getCurrentMonthTokenForTimeZone("America/Los_Angeles", fixedInstant)).toBe("2026-02");
  });
});

