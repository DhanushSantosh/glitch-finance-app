import { Pressable, View, Platform, LayoutChangeEvent } from "react-native";
import { AppTabRoute, tabSpecs } from "../../navigation/routes";
import { createStyles, theme } from "../../theme";
import { Home, ListOrdered, PieChart, Target, Settings } from "lucide-react-native";
import { BlurView } from "expo-blur";
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  interpolate,
  Extrapolation,
  type SharedValue
} from "react-native-reanimated";
import { useEffect, useState } from "react";

type BottomTabBarProps = {
  activeRoute: AppTabRoute;
  onChange: (route: AppTabRoute) => void;
};

const routeToIconMap: Record<AppTabRoute, any> = {
  dashboard: Home,
  transactions: ListOrdered,
  budgets: PieChart,
  goals: Target,
  settings: Settings
};

const AnimatedIconComponent = ({
  route,
  activeIndex,
  index,
  pillX,
  tabWidth
}: {
  route: AppTabRoute;
  activeIndex: number;
  index: number;
  pillX: SharedValue<number>;
  tabWidth: SharedValue<number>;
}) => {
  const Icon = routeToIconMap[route];
  const size = 22;

  // We cross-fade two icons (one active, one inactive) based on the exact physical position of the pill.
  // This is 100x more stable than trying to push animated color props into an SVG component.
  
  const activeOpacityStyle = useAnimatedStyle(() => {
    if (tabWidth.value === 0) {
      return { opacity: index === activeIndex ? 1 : 0 };
    }

    const currentPillIndex = pillX.value / tabWidth.value;
    const opacity = interpolate(
      currentPillIndex,
      [index - 0.5, index, index + 0.5],
      [0, 1, 0],
      Extrapolation.CLAMP
    );

    return { opacity };
  });

  const inactiveOpacityStyle = useAnimatedStyle(() => {
    if (tabWidth.value === 0) {
      return { opacity: index === activeIndex ? 0 : 1 };
    }

    const currentPillIndex = pillX.value / tabWidth.value;
    const opacity = interpolate(
      currentPillIndex,
      [index - 0.5, index, index + 0.5],
      [1, 0, 1],
      Extrapolation.CLAMP
    );

    return { opacity };
  });

  if (!Icon) return null;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute' }, inactiveOpacityStyle]}>
        <Icon size={size} color="rgba(255, 255, 255, 0.5)" strokeWidth={2} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute' }, activeOpacityStyle]}>
        <Icon size={size} color="#000000" strokeWidth={2.5} />
      </Animated.View>
    </View>
  );
};

export const BottomTabBar = ({ activeRoute, onChange }: BottomTabBarProps) => {
  const [layoutReady, setLayoutReady] = useState(false);
  const tabWidth = useSharedValue(0);
  const pillX = useSharedValue(0);

  const activeIndex = tabSpecs.findIndex(t => t.route === activeRoute);

  const onRowLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    const newTabWidth = width / tabSpecs.length;

    if (tabWidth.value === 0) {
      tabWidth.value = newTabWidth;
      pillX.value = activeIndex * newTabWidth;
      setLayoutReady(true);
    } else {
      tabWidth.value = newTabWidth;
    }
  };

  useEffect(() => {
    if (layoutReady) {
      // Lightning fast, snappy spring config
      pillX.value = withSpring(activeIndex * tabWidth.value, {
        damping: 14,
        stiffness: 300,
        mass: 0.3,
      });
    }
  }, [activeIndex, layoutReady]);

  const animatedPillStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: pillX.value }],
      width: tabWidth.value,
    };
  });


  return (
    <View style={styles.outerContainer} pointerEvents="box-none">
      <BlurView
        intensity={100} 
        tint="dark" 
        style={styles.wrapper}
      >
        <View style={styles.innerWrapper}>
          {/* Animated Liquid Pill */}
          {layoutReady && (
            <Animated.View style={[styles.pill, animatedPillStyle]}>
              <View style={styles.pillInner} />
            </Animated.View>
          )}

          <View style={styles.row} onLayout={onRowLayout}>
            {tabSpecs.map((tab, index) => {
              const active = tab.route === activeRoute;

              return (
                <Pressable
                  key={tab.route}
                  onPress={() => onChange(tab.route)}
                  style={styles.tab}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <View style={styles.iconWrap}>
                    <AnimatedIconComponent 
                      route={tab.route} 
                      activeIndex={activeIndex} 
                      index={index} 
                      pillX={pillX} 
                      tabWidth={tabWidth} 
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </BlurView>
    </View>
  );
  };

  const styles = createStyles(() => ({
  outerContainer: {
    position: "absolute",
    bottom: 32,
    left: theme.spacing.xl,
    right: theme.spacing.xl,
    alignItems: "center",
    zIndex: 1000,
  },
  wrapper: {
    width: "100%",
    backgroundColor: "rgba(5, 5, 5, 0.75)", // Heavy dark opacity to hide text
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.12)", // Subtle rim highlight
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.8,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
  },

  innerWrapper: {
    width: "100%",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    position: "relative",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    zIndex: 2,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    width: "100%",
  },
  pill: {
    position: "absolute",
    top: theme.spacing.sm,
    bottom: theme.spacing.sm,
    left: theme.spacing.md, // Match innerWrapper padding
    paddingHorizontal: 4,
    zIndex: 1,
  },
  pillInner: {
    flex: 1,
    backgroundColor: theme.color.actionPrimary,
    borderRadius: 24,
    shadowColor: theme.color.actionPrimary,
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  }
}));
