import { useState } from "react";
import { View } from "react-native";
import { AppHeader, Button, Card, InlineMessage, publishToast, Screen, TextField } from "../components/ui";
import { createStyles, theme } from "../theme";

type OtpVerifyScreenProps = {
  email: string;
  onBack: () => void;
  onVerify: (code: string) => Promise<void>;
};

export const OtpVerifyScreen = ({ email, onBack, onVerify }: OtpVerifyScreenProps) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    try {
      setLoading(true);
      await onVerify(code);
    } catch (verifyError) {
      publishToast({
        tone: "error",
        title: "Unable to verify OTP",
        message: verifyError instanceof Error ? verifyError.message : "Unable to verify OTP."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboardAware contentContainerStyle={styles.container}>
      <Card variant="glass" style={styles.authCard}>
        <AppHeader 
          title="Verify Account" 
          subtitle={`A unique 6-digit code has been sent to ${email}.`} 
          style={styles.header}
        />

        <View style={styles.form}>
          <TextField
            label="Security Passcode"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            placeholder="······"
            textContentType="oneTimeCode"
            style={styles.otpInput}
          />

          <Button 
            label="Verify & Sign In" 
            loading={loading} 
            disabled={code.length !== 6} 
            onPress={() => void handleVerify()} 
            style={styles.submitButton}
          />
          
          <Button 
            label="Change Email Address" 
            variant="ghost" 
            onPress={onBack} 
            style={styles.backButton}
          />
        </View>

        <InlineMessage tone="info" text="Dev Mode: Check API logs for code." />
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
    gap: theme.spacing.md
  },
  otpInput: {
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 8
  },
  submitButton: {
    marginTop: theme.spacing.md
  },
  backButton: {
    minHeight: 40
  }
}));
