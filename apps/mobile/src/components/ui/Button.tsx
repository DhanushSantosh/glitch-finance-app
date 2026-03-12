import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleProp, Text, ViewStyle } from "react-native";
import { createStyles, theme } from "../../theme";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export const getButtonPalette = (variant: ButtonVariant): { background: string; text: string } => {
  if (variant === "primary") {
    return { background: theme.color.actionPrimary, text: theme.color.textInverse };
  }
  if (variant === "secondary") {
    return { background: theme.color.actionSecondary, text: theme.color.textPrimary };
  }
  if (variant === "danger") {
    return { background: theme.color.actionDanger, text: theme.color.textInverse };
  }
  return { background: theme.color.actionGhost, text: theme.color.textPrimary };
};

type ButtonProps = {
  label: string | ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const Button = ({ label, onPress, variant = "primary", disabled = false, loading = false, style }: ButtonProps) => {
  const palette = getButtonPalette(variant);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.background },
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style
      ]}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        typeof label === "string" ? <Text style={[styles.label, { color: palette.text }]}>{label}</Text> : label
      )}
    </Pressable>
  );
};


const styles = createStyles(() => ({
  base: {
    minHeight: 52,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    shadowColor: theme.color.actionPrimary,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  label: {
    fontSize: theme.typography.body,
    fontWeight: "700",
    letterSpacing: 0.5
  },
  pressed: {
    opacity: theme.state.pressedOpacity,
    transform: [{ scale: 0.98 }]
  },
  disabled: {
    opacity: theme.state.disabledOpacity
  }
}));

