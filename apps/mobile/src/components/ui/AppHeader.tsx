import { ReactNode } from "react";
import { StyleProp, Text, View, ViewStyle } from "react-native";
import { createStyles, theme } from "../../theme";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export const AppHeader = ({ title, subtitle, rightSlot, style }: AppHeaderProps) => {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.titleWrap}>
        <Text style={styles.title} maxFontSizeMultiplier={1.3}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.4}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightSlot ? <View style={styles.right}>{rightSlot}</View> : null}
    </View>
  );
};

const styles = createStyles(() => ({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing.md
  },
  titleWrap: {
    flex: 1,
    gap: theme.spacing.xs
  },
  title: {
    color: theme.color.textPrimary,
    fontWeight: "800",
    fontSize: theme.typography.title
  },
  subtitle: {
    color: theme.color.textSecondary,
    fontSize: theme.typography.bodySmall,
    lineHeight: 20
  },
  right: {
    alignSelf: "center"
  }
}));
