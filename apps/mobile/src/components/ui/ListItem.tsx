import { ReactNode } from "react";
import { Text, View } from "react-native";
import { createStyles, theme } from "../../theme";
import { Card } from "./Card";

type ListItemProps = {
  title: string;
  subtitle?: string;
  detail?: string;
  trailing?: ReactNode;
  meta?: string;
  children?: ReactNode;
  useCard?: boolean;
};

export const ListItem = ({ title, subtitle, detail, meta, trailing, children, useCard = false }: ListItemProps) => {
  const content = (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
          {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {children}
    </View>
  );

  if (useCard) {
    return <Card>{content}</Card>;
  }

  return <View style={styles.borderBottom}>{content}</View>;
};

const styles = createStyles(() => ({
  container: {
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: theme.color.borderSubtle
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.md
  },
  content: {
    flex: 1,
    gap: 2
  },
  trailing: {
    alignSelf: "center"
  },
  title: {
    color: theme.color.textPrimary,
    fontSize: theme.typography.body,
    fontWeight: "600",
    letterSpacing: -0.2
  },
  subtitle: {
    color: theme.color.textSecondary,
    fontSize: theme.typography.bodySmall,
    fontWeight: "500"
  },
  detail: {
    color: theme.color.textPrimary,
    fontSize: theme.typography.bodySmall
  },
  meta: {
    color: theme.color.textMuted,
    fontSize: theme.typography.caption,
    fontWeight: "600",
    textTransform: "uppercase"
  }
}));

