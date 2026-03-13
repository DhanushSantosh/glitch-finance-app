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
    borderColor: "rgba(255, 255, 255, 0.08)"
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
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1.5
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


