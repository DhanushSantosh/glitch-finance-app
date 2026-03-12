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
};

export const SegmentedControl = <T extends string>({ options, selected, onSelect }: SegmentedControlProps<T>) => {
  return (
    <View style={styles.row}>
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
  );
};

const styles = createStyles(() => ({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  segment: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: theme.color.borderSubtle,
    backgroundColor: theme.color.surfaceMuted,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    justifyContent: "center"
  },
  segmentActive: {
    borderColor: theme.color.actionPrimary,
    backgroundColor: theme.color.actionPrimary
  },
  label: {
    color: theme.color.textSecondary,
    fontSize: theme.typography.bodySmall,
    fontWeight: "700"
  },
  labelActive: {
    color: theme.color.textInverse
  },
  pressed: {
    opacity: theme.state.pressedOpacity
  }
}));
