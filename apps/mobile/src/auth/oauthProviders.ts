import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

// @react-native-google-signin/google-signin requires a native build — not available in Expo Go.
// Lazy-require so the import doesn't crash the runtime when the native module is absent.
let _googleSignin: typeof import("@react-native-google-signin/google-signin") | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  _googleSignin = require("@react-native-google-signin/google-signin");
} catch {
  // Running in Expo Go or an environment without the native module — button can still render,
  // but sign-in will explain that a native build is required.
}

export type GoogleSignInResult = {
  idToken: string;
  nonce?: string;
};

export type AppleSignInResult = {
  identityToken: string;
  rawNonce: string;
  audience: "app" | "service";
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

const APPLE_AUTH_CALLBACK_PATH = "api/v1/auth/oauth/apple/callback";

const getFirstQueryValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const parseAppleUser = (value: string | undefined): AppleSignInResult["user"] | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = JSON.parse(value) as {
    firstName?: unknown;
    lastName?: unknown;
    email?: unknown;
  };

  const user = {
    firstName: typeof parsed.firstName === "string" ? parsed.firstName : undefined,
    lastName: typeof parsed.lastName === "string" ? parsed.lastName : undefined,
    email: typeof parsed.email === "string" ? parsed.email : undefined
  };

  return user.firstName || user.lastName || user.email ? user : undefined;
};

const buildAppleUser = (
  credential: Pick<
    AppleAuthentication.AppleAuthenticationCredential,
    "fullName" | "email"
  >
): AppleSignInResult["user"] | undefined => {
  if (!credential.fullName?.givenName && !credential.fullName?.familyName && !credential.email) {
    return undefined;
  }

  return {
    firstName: credential.fullName?.givenName ?? undefined,
    lastName: credential.fullName?.familyName ?? undefined,
    email: credential.email ?? undefined
  };
};

const signInWithAppleBrowser = async (apiBaseUrl: string): Promise<AppleSignInResult> => {
  const serviceId = process.env.EXPO_PUBLIC_APPLE_SERVICE_ID;
  if (!serviceId) {
    throw new Error("Apple Sign-In is not configured for browser-based sign-in.");
  }

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "velqora",
    path: "oauth/apple"
  });
  const callbackUri = `${apiBaseUrl}/${APPLE_AUTH_CALLBACK_PATH}`;
  const rawNonce = Crypto.randomUUID();
  const clientState = Crypto.randomUUID();
  const nonceDigest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  const state = JSON.stringify({ clientState, rawNonce, redirectUri });

  const authUrl = new URL("https://appleid.apple.com/auth/authorize");
  authUrl.searchParams.set("client_id", serviceId);
  authUrl.searchParams.set("redirect_uri", callbackUri);
  authUrl.searchParams.set("response_type", "id_token");
  authUrl.searchParams.set("response_mode", "form_post");
  authUrl.searchParams.set("scope", "name email");
  authUrl.searchParams.set("nonce", nonceDigest);
  authUrl.searchParams.set("state", state);

  const result = await WebBrowser.openAuthSessionAsync(authUrl.toString(), redirectUri);

  if (result.type === "cancel" || result.type === "dismiss") {
    throw new Error("Apple Sign-In was cancelled.");
  }

  if (result.type !== "success" || !result.url) {
    throw new Error("Apple Sign-In did not complete successfully.");
  }

  const params = Linking.parse(result.url).queryParams ?? {};
  const returnedState = getFirstQueryValue(params.state);
  if (returnedState !== clientState) {
    throw new Error("Apple Sign-In state verification failed.");
  }

  const error = getFirstQueryValue(params.error);
  if (error) {
    const errorDescription = getFirstQueryValue(params.errorDescription);
    throw new Error(errorDescription ?? `Apple Sign-In failed: ${error}.`);
  }

  const identityToken = getFirstQueryValue(params.identityToken);
  const returnedRawNonce = getFirstQueryValue(params.rawNonce);

  if (!identityToken || !returnedRawNonce) {
    throw new Error("Apple Sign-In did not return the expected authentication payload.");
  }

  return {
    identityToken,
    rawNonce: returnedRawNonce,
    audience: "service",
    user: parseAppleUser(getFirstQueryValue(params.user))
  };
};

export function isGoogleSignInAvailable(): boolean {
  return process.env.EXPO_PUBLIC_GOOGLE_OAUTH_ENABLED === "true";
}

export function configureGoogleSignIn(webClientId: string): void {
  if (!_googleSignin) return;
  _googleSignin.GoogleSignin.configure({ webClientId, offlineAccess: false });
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  if (!_googleSignin) {
    throw new Error("Google Sign-In requires a development build (not available in Expo Go).");
  }

  const { GoogleSignin, isErrorWithCode, statusCodes } = _googleSignin;

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (!response.data?.idToken) {
      throw new Error("Google Sign-In did not return an ID token.");
    }

    return { idToken: response.data.idToken };
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error("Google Sign-In was cancelled.");
      }
      if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error("Google Sign-In is already in progress.");
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error("Google Play Services are not available.");
      }
    }
    throw error instanceof Error ? error : new Error("Google Sign-In failed.");
  }
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS === "ios" && (await AppleAuthentication.isAvailableAsync())) {
    return true;
  }

  return Boolean(process.env.EXPO_PUBLIC_APPLE_SERVICE_ID);
}

export async function signInWithApple(apiBaseUrl: string): Promise<AppleSignInResult> {
  if (Platform.OS !== "ios" || !(await AppleAuthentication.isAvailableAsync())) {
    return signInWithAppleBrowser(apiBaseUrl);
  }

  const rawNonce = Crypto.randomUUID();
  const nonceDigest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL
    ],
    nonce: nonceDigest
  });

  if (!credential.identityToken) {
    throw new Error("Apple Sign-In did not return an identity token.");
  }

  return {
    identityToken: credential.identityToken,
    rawNonce,
    audience: "app",
    user: buildAppleUser(credential)
  };
}
