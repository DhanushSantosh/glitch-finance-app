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
    gap: theme.spacing.xs
  },
  label: {
    color: theme.color.textSecondary,
    fontSize: theme.typography.label,
    fontWeight: "700"
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.color.borderSubtle,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.surface,
    color: theme.color.textPrimary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.body
  },
  focused: {
    borderColor: theme.color.focusRing
  },
  errorBorder: {
    borderColor: theme.color.statusError
  },
  helperText: {
    color: theme.color.textMuted,
    fontSize: theme.typography.caption
  },
  errorText: {
    color: theme.color.statusError,
    fontSize: theme.typography.caption,
    fontWeight: "600"
  }
}));
