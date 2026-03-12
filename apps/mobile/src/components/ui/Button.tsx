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
  label: string;
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
      {loading ? <ActivityIndicator color={palette.text} /> : <Text style={[styles.label, { color: palette.text }]}>{label}</Text>}
    </Pressable>
  );
};

const styles = createStyles(() => ({
  base: {
    minHeight: 48,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm
  },
  label: {
    fontSize: theme.typography.bodySmall,
    fontWeight: "700"
  },
  pressed: {
    opacity: theme.state.pressedOpacity
  },
  disabled: {
    opacity: theme.state.disabledOpacity
  }
}));
