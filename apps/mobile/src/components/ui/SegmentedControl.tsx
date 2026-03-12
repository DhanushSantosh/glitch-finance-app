import { Pressable, Text, View } from "react-native";
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
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.groupLabel}>{label}</Text> : null}
      <View style={styles.track}>
        {options.map((option) => {
          const active = option.value === selected;
          return (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [styles.segment, active ? styles.segmentActive : null, pressed ? styles.pressed : null]}
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
    borderColor: theme.color.borderSubtle
  },
  segment: {
    flex: 1,
    minHeight: 36,
    borderRadius: theme.radius.pill,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.sm
  },
  segmentActive: {
    backgroundColor: theme.color.actionPrimary,
    ...theme.elevation.card,
    shadowColor: theme.color.actionPrimary,
    shadowOpacity: 0.3
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

