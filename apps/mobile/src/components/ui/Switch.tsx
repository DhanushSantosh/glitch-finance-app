import { useEffect } from "react";
import { Pressable } from "react-native";
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  interpolateColor
} from "react-native-reanimated";
import { createStyles, theme } from "../../theme";

type SwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

export const Switch = ({ value, onValueChange, disabled }: SwitchProps) => {
  const translateX = useSharedValue(value ? 20 : 0);

  useEffect(() => {
    translateX.value = withSpring(value ? 20 : 0, {
      damping: 15,
      stiffness: 300,
      mass: 0.5,
    });
  }, [value]);

  const animatedThumbStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const animatedTrackStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      translateX.value,
      [0, 20],
      [theme.color.borderStrong, theme.color.actionPrimary]
    );
    return { backgroundColor };
  });

  return (
    <Pressable 
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      style={({ pressed }) => [
        styles.container, 
        disabled && styles.disabled,
        pressed && styles.pressed
      ]}
    >
      <Animated.View style={[styles.track, animatedTrackStyle]}>
        <Animated.View style={[styles.thumb, animatedThumbStyle]} />
      </Animated.View>
    </Pressable>
  );
};

const styles = createStyles(() => ({
  container: {
    width: 48,
    height: 28,
    justifyContent: "center",
  },
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 4,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
  }
}));
