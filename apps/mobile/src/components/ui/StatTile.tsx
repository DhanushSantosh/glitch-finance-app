import { Text, View } from "react-native";
import { createStyles, theme } from "../../theme";

type StatTone = "default" | "positive" | "negative" | "info";

type StatTileProps = {
  label: string;
  value: string;
  tone?: StatTone;
};

export const StatTile = ({ label, value, tone = "default" }: StatTileProps) => {
  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, tone === "positive" ? styles.positive : null, tone === "negative" ? styles.negative : null, tone === "info" ? styles.info : null]}>
        {value}
      </Text>
    </View>
  );
};

const styles = createStyles(() => ({
  tile: {
    flex: 1,
    minWidth: 148,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.color.borderSubtle,
    backgroundColor: theme.color.surface,
    padding: theme.spacing.md,
    gap: theme.spacing.xs
  },
  label: {
    color: theme.color.textMuted,
    fontSize: theme.typography.caption,
    fontWeight: "700"
  },
  value: {
    color: theme.color.textPrimary,
    fontSize: theme.typography.heading,
    fontWeight: "800"
  },
  positive: {
    color: theme.color.statusSuccess
  },
  negative: {
    color: theme.color.statusError
  },
  info: {
    color: theme.color.statusInfo
  }
}));
