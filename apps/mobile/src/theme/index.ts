import { StyleSheet } from "react-native";
import { lightTheme, darkTheme } from "./tokens";
import { ThemeTokens } from "./types";

export const theme: ThemeTokens = lightTheme;
export const themes = {
  light: lightTheme,
  dark: darkTheme
} as const;

export const createStyles = <T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (tokens: ThemeTokens) => T
): T => StyleSheet.create(factory(theme));
