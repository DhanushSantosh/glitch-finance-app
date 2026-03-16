import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes
} from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";

export type GoogleSignInResult = {
  idToken: string;
  nonce?: string;
};

export type AppleSignInResult = {
  identityToken: string;
  rawNonce: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

export function configureGoogleSignIn(webClientId: string): void {
  GoogleSignin.configure({ webClientId, offlineAccess: false });
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
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
  if (Platform.OS !== "ios") return false;
  return AppleAuthentication.isAvailableAsync();
}

export async function signInWithApple(): Promise<AppleSignInResult> {
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
    user:
      credential.fullName?.givenName || credential.fullName?.familyName || credential.email
        ? {
            firstName: credential.fullName?.givenName ?? undefined,
            lastName: credential.fullName?.familyName ?? undefined,
            email: credential.email ?? undefined
          }
        : undefined
  };
}
