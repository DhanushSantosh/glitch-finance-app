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
    <View style={[styles.container, style]}>
      <View style={styles.row}>
        <View style={styles.titleWrap}>
          <Text style={styles.title} maxFontSizeMultiplier={1.2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightSlot ? <View style={styles.right}>{rightSlot}</View> : null}
      </View>
    </View>
  );
};

const styles = createStyles(() => ({
  container: {
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.borderSubtle,
    marginBottom: theme.spacing.xs
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.md
  },
  titleWrap: {
    flex: 1,
    gap: 2
  },
  title: {
    color: theme.color.textPrimary,
    fontWeight: "900",
    fontSize: theme.typography.display,
    letterSpacing: -1
  },
  subtitle: {
    color: theme.color.textSecondary,
    fontSize: theme.typography.bodySmall,
    fontWeight: "500",
    lineHeight: 18
  },
  right: {
    justifyContent: "center"
  }
}));

