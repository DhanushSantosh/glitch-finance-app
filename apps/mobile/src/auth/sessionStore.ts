import * as SecureStore from "expo-secure-store";
import { SESSION_TOKEN_KEY } from "../appMetadata";

export const saveSessionToken = async (token: string): Promise<void> => {
  await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
};

export const readSessionToken = async (): Promise<string | null> => {
  return SecureStore.getItemAsync(SESSION_TOKEN_KEY);
};

export const clearSessionToken = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
};
