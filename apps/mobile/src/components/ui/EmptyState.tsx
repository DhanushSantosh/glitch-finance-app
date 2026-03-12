import { Text, View } from "react-native";
import { createStyles, theme } from "../../theme";

type EmptyStateProps = {
  title: string;
  description: string;
};

export const EmptyState = ({ title, description }: EmptyStateProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
};

const styles = createStyles(() => ({
  container: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.borderSubtle,
    backgroundColor: theme.color.surface,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs
  },
  title: {
    color: theme.color.textPrimary,
    fontSize: theme.typography.heading,
    fontWeight: "700"
  },
  description: {
    color: theme.color.textSecondary,
    fontSize: theme.typography.bodySmall,
    lineHeight: 20
  }
}));
