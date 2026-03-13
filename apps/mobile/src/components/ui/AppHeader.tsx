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
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    marginBottom: theme.spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
    gap: theme.spacing.md
  },
  titleWrap: {
    flex: 1,
    gap: 0
  },
  title: {
    color: theme.color.textPrimary,
    fontWeight: "900",
    fontSize: 28,
    letterSpacing: -1.5,
    lineHeight: 32
  },
  subtitle: {
    color: theme.color.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 2
  },
  right: {
    justifyContent: "center"
  }
}));

