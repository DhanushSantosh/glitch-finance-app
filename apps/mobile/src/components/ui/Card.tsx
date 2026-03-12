import { PropsWithChildren } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { createStyles, theme } from "../../theme";

type CardVariant = "default" | "muted" | "highlight" | "glass";

type CardProps = PropsWithChildren<{
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
}>;

const variantStyles: Record<CardVariant, ViewStyle> = {
  default: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.borderSubtle
  },
  muted: {
    backgroundColor: "transparent",
    borderColor: theme.color.borderSubtle,
    borderStyle: "dashed"
  },
  highlight: {
    backgroundColor: theme.color.bgElevated,
    borderColor: theme.color.actionPrimary
  },
  glass: {
    backgroundColor: theme.color.surfaceMuted,
    borderColor: theme.color.borderSubtle,
    borderWidth: 1
  }
};

export const Card = ({ children, variant = "default", style }: CardProps) => {
  return <View style={[styles.base, variantStyles[variant], style]}>{children}</View>;
};

const styles = createStyles(() => ({
  base: {
    borderWidth: 1,
    borderRadius: theme.radius.md, // Tighter radius for a sharper, more technical look
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    // Shadows removed: True black UI relies on borders and contrast, not shadows
  }
}));


