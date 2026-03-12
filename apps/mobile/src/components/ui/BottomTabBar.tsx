import { Pressable, Text, View } from "react-native";
import { AppTabRoute, tabSpecs } from "../../navigation/routes";
import { createStyles, theme } from "../../theme";

type BottomTabBarProps = {
  activeRoute: AppTabRoute;
  onChange: (route: AppTabRoute) => void;
};

export const BottomTabBar = ({ activeRoute, onChange }: BottomTabBarProps) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {tabSpecs.map((tab) => {
          const active = tab.route === activeRoute;

          return (
            <Pressable
              key={tab.route}
              onPress={() => onChange(tab.route)}
              style={({ pressed }) => [styles.tab, active ? styles.tabActive : null, pressed ? styles.pressed : null]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.label, active ? styles.labelActive : null]} numberOfLines={1}>
                {tab.shortLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = createStyles(() => ({
  wrapper: {
    borderTopWidth: 1,
    borderTopColor: theme.color.borderSubtle,
    backgroundColor: theme.color.surface,
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.xs
  },
  tab: {
    flex: 1,
    minHeight: 48,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.actionGhost,
    paddingHorizontal: theme.spacing.xs
  },
  tabActive: {
    backgroundColor: theme.color.actionPrimary
  },
  label: {
    color: theme.color.textSecondary,
    fontSize: theme.typography.caption,
    fontWeight: "700"
  },
  labelActive: {
    color: theme.color.textInverse
  },
  pressed: {
    opacity: theme.state.pressedOpacity
  }
}));
