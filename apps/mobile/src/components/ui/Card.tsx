import { PropsWithChildren } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { createStyles, theme } from "../../theme";

type CardVariant = "default" | "muted" | "highlight";

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
    backgroundColor: theme.color.surfaceMuted,
    borderColor: theme.color.borderSubtle
  },
  highlight: {
    backgroundColor: theme.color.bgElevated,
    borderColor: theme.color.borderStrong
  }
};

export const Card = ({ children, variant = "default", style }: CardProps) => {
  return <View style={[styles.base, variantStyles[variant], style]}>{children}</View>;
};

const styles = createStyles(() => ({
  base: {
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.elevation.card
  }
}));
