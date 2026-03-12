import { Text, View } from "react-native";
import { createStyles, theme } from "../../theme";

type MessageTone = "info" | "success" | "warn" | "error";

type InlineMessageProps = {
  tone?: MessageTone;
  text: string;
};

export const InlineMessage = ({ tone = "info", text }: InlineMessageProps) => {
  return (
    <View style={[styles.base, tone === "success" ? styles.success : null, tone === "warn" ? styles.warn : null, tone === "error" ? styles.error : null]}>
      <Text style={[styles.text, tone === "success" ? styles.successText : null, tone === "warn" ? styles.warnText : null, tone === "error" ? styles.errorText : null]}>
        {text}
      </Text>
    </View>
  );
};

const styles = createStyles(() => ({
  base: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.color.borderSubtle,
    backgroundColor: theme.color.surfaceMuted,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  text: {
    color: theme.color.textSecondary,
    fontSize: theme.typography.bodySmall,
    fontWeight: "600"
  },
  success: {
    borderColor: theme.color.statusSuccess,
    backgroundColor: theme.color.actionSecondary
  },
  warn: {
    borderColor: theme.color.statusWarn,
    backgroundColor: theme.color.surface
  },
  error: {
    borderColor: theme.color.statusError,
    backgroundColor: theme.color.surface
  },
  successText: {
    color: theme.color.statusSuccess
  },
  warnText: {
    color: theme.color.statusWarn
  },
  errorText: {
    color: theme.color.statusError
  }
}));
