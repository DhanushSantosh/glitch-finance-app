import { Pressable, View } from "react-native";
import { AppTabRoute, tabSpecs } from "../../navigation/routes";
import { createStyles, theme } from "../../theme";
import { Home, ListOrdered, PieChart, Target, Settings } from "lucide-react-native";

type BottomTabBarProps = {
  activeRoute: AppTabRoute;
  onChange: (route: AppTabRoute) => void;
};

const getIconForRoute = (route: AppTabRoute, active: boolean) => {
  const color = active ? theme.color.actionPrimary : theme.color.textSecondary;
  const size = 24;
  const strokeWidth = active ? 2.5 : 2;

  switch (route) {
    case "dashboard":
      return <Home size={size} color={color} strokeWidth={strokeWidth} />;
    case "transactions":
      return <ListOrdered size={size} color={color} strokeWidth={strokeWidth} />;
    case "budgets":
      return <PieChart size={size} color={color} strokeWidth={strokeWidth} />;
    case "goals":
      return <Target size={size} color={color} strokeWidth={strokeWidth} />;
    case "settings":
      return <Settings size={size} color={color} strokeWidth={strokeWidth} />;
    default:
      return null;
  }
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
              style={({ pressed }) => [
                styles.tab, 
                pressed ? styles.pressed : null
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              {getIconForRoute(tab.route, active)}
              {active ? <View style={styles.dot} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = createStyles(() => ({
  wrapper: {
    backgroundColor: theme.color.bgBase, // Use pure black instead of surface for edge-to-edge bleed
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: 36, // Proper spacing for home indicator
    borderTopWidth: 1,
    borderTopColor: theme.color.borderSubtle,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    position: "relative"
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.color.actionPrimary,
    position: "absolute",
    bottom: 2,
    shadowColor: theme.color.actionPrimary,
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 }
  },
  pressed: {
    opacity: 0.6,
    transform: [{ scale: 0.92 }]
  }
}));


