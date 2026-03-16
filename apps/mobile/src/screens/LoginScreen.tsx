import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { AppHeader, Button, Card, publishToast, Screen, TextField } from "../components/ui";
import { createStyles, theme } from "../theme";

type LoginScreenProps = {
  onRequestOtp: (email: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onAppleSignIn: () => Promise<void>;
};

export const LoginScreen = ({ onRequestOtp, onGoogleSignIn, onAppleSignIn }: LoginScreenProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === "ios") {
      void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  const handleSendOtp = async () => {
    try {
      setLoading(true);
      await onRequestOtp(email);
    } catch (requestError) {
      publishToast({
        tone: "error",
        title: "Unable to request OTP",
        message: requestError instanceof Error ? requestError.message : "Unable to request OTP."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      await onGoogleSignIn();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google Sign-In failed.";
      if (!message.includes("cancelled")) {
        publishToast({ tone: "error", title: "Google Sign-In", message });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setAppleLoading(true);
      await onAppleSignIn();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Apple Sign-In failed.";
      if (!message.includes("cancelled") && !message.includes("ERR_CANCELED")) {
        publishToast({ tone: "error", title: "Apple Sign-In", message });
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const anyLoading = loading || googleLoading || appleLoading;

  return (
    <Screen keyboardAware contentContainerStyle={styles.container}>
      <Card variant="glass" style={styles.authCard}>
        <AppHeader
          title="Glitch"
          subtitle="Precision finance tracking for the modern era. Securely sign in to continue."
          style={styles.header}
        />

        <View style={styles.form}>
          <TextField
            label="Email Address"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="name@domain.com"
            helperText="A secure OTP will be sent to this email."
          />

          <Button
            label="Continue with Email"
            loading={loading}
            disabled={email.trim().length === 0 || anyLoading}
            onPress={() => void handleSendOtp()}
            style={styles.submitButton}
          />
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.oauthButtons}>
          <Button
            label="Continue with Google"
            variant="secondary"
            loading={googleLoading}
            disabled={anyLoading}
            onPress={() => void handleGoogleSignIn()}
          />

          {appleAvailable && (
            <Button
              label="Continue with Apple"
              variant="secondary"
              loading={appleLoading}
              disabled={anyLoading}
              onPress={() => void handleAppleSignIn()}
            />
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>By continuing, you agree to our Terms and Privacy Policy.</Text>
        </View>
      </Card>
    </Screen>
  );
};

const styles = createStyles(() => ({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: theme.spacing.xxl
  },
  authCard: {
    padding: theme.spacing.xl,
    gap: theme.spacing.xl
  },
  header: {
    borderBottomWidth: 0,
    marginBottom: 0
  },
  form: {
    gap: theme.spacing.lg
  },
  submitButton: {
    marginTop: theme.spacing.md
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  dividerText: {
    color: theme.color.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1
  },
  oauthButtons: {
    gap: theme.spacing.md
  },
  footer: {
    alignItems: "center",
    marginTop: theme.spacing.sm
  },
  footerText: {
    color: theme.color.textMuted,
    fontSize: 10,
    textAlign: "center",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5
  }
}));
