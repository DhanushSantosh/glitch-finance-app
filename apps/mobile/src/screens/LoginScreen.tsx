import { useState } from "react";
import { Text, View } from "react-native";
import { AppHeader, Button, Card, publishToast, Screen, TextField } from "../components/ui";
import { createStyles, theme } from "../theme";

type LoginScreenProps = {
  onRequestOtp: (email: string) => Promise<void>;
};

export const LoginScreen = ({ onRequestOtp }: LoginScreenProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

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
            label="Continue" 
            loading={loading} 
            disabled={email.trim().length === 0} 
            onPress={() => void handleSendOtp()} 
            style={styles.submitButton}
          />
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
