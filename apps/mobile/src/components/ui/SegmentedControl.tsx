import { useState, useEffect } from "react";
import { Pressable, Text, View, LayoutChangeEvent } from "react-native";
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  interpolateColor
} from "react-native-reanimated";
import { createStyles, theme } from "../../theme";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: ReadonlyArray<SegmentOption<T>>;
  selected: T;
  onSelect: (value: T) => void;
  label?: string;
};

export const SegmentedControl = <T extends string>({ options, selected, onSelect, label }: SegmentedControlProps<T>) => {
  const [layoutReady, setLayoutReady] = useState(false);
  const tabWidth = useSharedValue(0);
  const pillX = useSharedValue(0);

  const activeIndex = Math.max(0, options.findIndex(o => o.value === selected));

  const onTrackLayout = (event: LayoutChangeEvent) => {
    // Total width minus horizontal padding (theme.spacing.xs * 2 = 8)
    const padding = theme.spacing.xs * 2;
    // We also have gap: 4 between segments, total gap = (options.length - 1) * 4
    const totalGap = (options.length - 1) * 4;
    const availableWidth = event.nativeEvent.layout.width - padding - totalGap;
    const newTabWidth = availableWidth / options.length;

    if (tabWidth.value === 0) {
      tabWidth.value = newTabWidth;
      // Initial position without spring if we want, but spring is fine too
      pillX.value = activeIndex * (newTabWidth + 4);
      setLayoutReady(true);
    } else {
      tabWidth.value = newTabWidth;
    }
  };

  useEffect(() => {
    if (layoutReady) {
      pillX.value = withSpring(activeIndex * (tabWidth.value + 4), {
        damping: 15,
        stiffness: 300,
        mass: 0.5,
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
    <View style={styles.container}>
      {label ? <Text style={styles.groupLabel}>{label}</Text> : null}
      <View style={styles.track} onLayout={onTrackLayout}>
        {layoutReady && (
          <Animated.View style={[styles.activePill, animatedPillStyle]} />
        )}
        {options.map((option, index) => {
          const active = option.value === selected;
          return (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [styles.segment, pressed ? styles.pressed : null]}
            >
              <Text style={[styles.label, active ? styles.labelActive : null]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = createStyles(() => ({
  container: {
    gap: theme.spacing.sm
  },
  groupLabel: {
    color: theme.color.textSecondary,
    fontSize: theme.typography.label,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: theme.spacing.xs
  },
  track: {
    flexDirection: "row",
    backgroundColor: theme.color.surfaceMuted,
    borderRadius: theme.radius.pill,
    padding: theme.spacing.xs,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.color.borderSubtle,
    position: "relative" // important for absolute child
  },
  activePill: {
    position: "absolute",
    top: theme.spacing.xs,
    bottom: theme.spacing.xs,
    left: theme.spacing.xs,
    backgroundColor: theme.color.actionPrimary,
    borderRadius: theme.radius.pill,
    shadowColor: theme.color.actionPrimary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 1
  },
  segment: {
    flex: 1,
    minHeight: 36,
    borderRadius: theme.radius.pill,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.sm,
    zIndex: 2
  },
  label: {
    color: theme.color.textSecondary,
    fontSize: theme.typography.bodySmall,
    fontWeight: "600"
  },
  labelActive: {
    color: theme.color.textInverse,
    fontWeight: "700"
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }]
  }
}));

