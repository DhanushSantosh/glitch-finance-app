import { PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  View,
  ViewStyle
} from "react-native";
import { createStyles, theme } from "../../theme";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  keyboardAware?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}>;

const baseScrollProps: Partial<ScrollViewProps> = {
  keyboardShouldPersistTaps: "handled",
  showsVerticalScrollIndicator: false
};

export const Screen = ({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  keyboardAware = false,
  contentContainerStyle,
  testID
}: ScreenProps) => {
  const refreshControl = onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined;

  const body = scroll ? (
    <ScrollView
      {...baseScrollProps}
      testID={testID}
      refreshControl={refreshControl}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View testID={testID} style={[styles.viewContent, contentContainerStyle]}>
      {children}
    </View>
  );

  if (!keyboardAware) {
    return <View style={styles.root}>{body}</View>;
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {body}
    </KeyboardAvoidingView>
  );
};

const styles = createStyles(() => ({
  root: {
    flex: 1,
    backgroundColor: theme.color.bgBase
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: 120, // Increased to clear floating tab bar
    gap: theme.spacing.xl
  },
  viewContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: 120, // Increased to clear floating tab bar
    gap: theme.spacing.xl
  }
}));

