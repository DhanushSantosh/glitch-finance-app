import type { ComponentType } from "react";
import * as Sentry from "@sentry/react-native";
import type { User, UserProfile } from "../types";

const parseSampleRate = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, parsed));
};

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
const sentryEnvironment = process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT?.trim() || (__DEV__ ? "development" : "production");
const tracesSampleRate = parseSampleRate(process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE, __DEV__ ? 1 : 0.1);

let initialized = false;

export const isSentryEnabled = (): boolean => Boolean(sentryDsn);

export const initMobileSentry = (): void => {
  if (initialized || !isSentryEnabled()) {
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    enabled: true,
    environment: sentryEnvironment,
    tracesSampleRate,
    sendDefaultPii: false,
    attachStacktrace: true,
    initialScope: {
      tags: {
        service: "velqora-mobile",
        runtime: "expo"
      }
    }
  });

  initialized = true;
};

export const wrapRootComponent = <T extends ComponentType<any>>(Component: T): T => {
  if (!isSentryEnabled()) {
    return Component;
  }

  return Sentry.wrap(Component) as T;
};

export const syncSentryUser = (user: User | null, profile: UserProfile | null): void => {
  if (!isSentryEnabled()) {
    return;
  }

  if (!user) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    ...(profile?.displayName ? { username: profile.displayName } : {})
  });

  if (profile) {
    Sentry.setTag("profile.currency", profile.currency);
    Sentry.setTag("profile.timezone", profile.timezone);
    Sentry.setTag("profile.locale", profile.locale);
  }
};
