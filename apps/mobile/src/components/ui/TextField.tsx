import { useState } from "react";
import { StyleProp, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { createStyles, theme } from "../../theme";

type TextFieldProps = TextInputProps & {
  label?: string;
  helperText?: string;
  errorText?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
};

export const TextField = ({ label, helperText, errorText, containerStyle, style, ...props }: TextFieldProps) => {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(errorText);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...props}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        style={[
          styles.input,
          focused ? styles.focused : null,
          hasError ? styles.errorBorder : null,
          style
        ]}
        placeholderTextColor={theme.color.textMuted}
      />
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
      {!errorText && helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
};

const styles = createStyles(() => ({
  container: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm
  },
  label: {
    color: theme.color.textSecondary,
    fontSize: theme.typography.label,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: theme.spacing.xs
  },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: theme.color.borderSubtle,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surfaceMuted,
    color: theme.color.textPrimary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  focused: {
    borderColor: theme.color.actionPrimary,
    backgroundColor: theme.color.surface
  },
  errorBorder: {
    borderColor: theme.color.statusError
  },
  helperText: {
    color: theme.color.textMuted,
    fontSize: theme.typography.caption,
    marginLeft: theme.spacing.xs,
    fontWeight: "500"
  },
  errorText: {
    color: theme.color.statusError,
    fontSize: theme.typography.caption,
    fontWeight: "700",
    marginLeft: theme.spacing.xs
  }
}));

