import * as SecureStore from "expo-secure-store";

const SESSION_TOKEN_KEY = "glitch_session_token";

export const saveSessionToken = async (token: string): Promise<void> => {
  await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
};

export const readSessionToken = async (): Promise<string | null> => {
  return SecureStore.getItemAsync(SESSION_TOKEN_KEY);
};

export const clearSessionToken = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
};
