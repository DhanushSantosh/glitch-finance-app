import { ReactNode } from "react";
import { Text, View } from "react-native";
import { createStyles, theme } from "../../theme";

type StatTone = "default" | "positive" | "negative" | "info";

type StatTileProps = {
  label: string;
  value: string;
  tone?: StatTone;
  icon?: ReactNode;
};

export const StatTile = ({ label, value, tone = "default", icon }: StatTileProps) => {
  return (
    <View style={[styles.tile, tone === "positive" ? styles.tilePositive : tone === "negative" ? styles.tileNegative : null]}>
      <View style={[styles.accentLine, tone === "positive" ? styles.accentPositive : tone === "negative" ? styles.accentNegative : null]} />
      <View style={styles.headerRow}>
        {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={[styles.value, tone === "positive" ? styles.positive : tone === "negative" ? styles.negative : tone === "info" ? styles.info : null]}>
        {value}
      </Text>
    </View>
  );
};

const styles = createStyles(() => ({
  tile: {
    flex: 1,
    minWidth: 140,
    borderRadius: theme.radius.sm,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    padding: theme.spacing.md,
    paddingLeft: theme.spacing.lg, // Extra space for accent line
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    position: "relative",
    overflow: "hidden"
  },
  accentLine: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: "rgba(255, 255, 255, 0.1)"
  },
  accentPositive: {
    backgroundColor: theme.color.statusSuccess
  },
  accentNegative: {
    backgroundColor: theme.color.statusError
  },
  tilePositive: {
    borderColor: "rgba(212, 255, 0, 0.1)"
  },
  tileNegative: {
    borderColor: "rgba(255, 51, 102, 0.1)"
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  iconContainer: {
    opacity: 0.7
  },
  label: {
    color: theme.color.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5
  },
  value: {
    color: theme.color.textPrimary,
    fontSize: theme.typography.heading,
    fontWeight: "800",
    letterSpacing: -0.5
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


