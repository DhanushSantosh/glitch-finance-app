import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_TOKEN_KEY = "glitch_session_token";

export const saveSessionToken = async (token: string): Promise<void> => {
  await AsyncStorage.setItem(SESSION_TOKEN_KEY, token);
};

export const readSessionToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem(SESSION_TOKEN_KEY);
};

export const clearSessionToken = async (): Promise<void> => {
  await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
};
