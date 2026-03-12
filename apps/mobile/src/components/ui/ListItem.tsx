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
};

export const ListItem = ({ title, subtitle, detail, meta, trailing, children }: ListItemProps) => {
  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
          {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {children}
    </Card>
  );
};

const styles = createStyles(() => ({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.md
  },
  content: {
    flex: 1,
    gap: theme.spacing.xs
  },
  trailing: {
    alignSelf: "center"
  },
  title: {
    color: theme.color.textPrimary,
    fontSize: theme.typography.body,
    fontWeight: "700"
  },
  subtitle: {
    color: theme.color.textSecondary,
    fontSize: theme.typography.bodySmall
  },
  detail: {
    color: theme.color.textPrimary,
    fontSize: theme.typography.bodySmall
  },
  meta: {
    color: theme.color.textMuted,
    fontSize: theme.typography.caption
  }
}));
