import { useState } from "react";
import { AppHeader, Button, Card, InlineMessage, Screen, TextField } from "../components/ui";

type LoginScreenProps = {
  onRequestOtp: (email: string) => Promise<void>;
};

export const LoginScreen = ({ onRequestOtp }: LoginScreenProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    try {
      setError(null);
      setLoading(true);
      await onRequestOtp(email);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to request OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboardAware>
      <Card>
        <AppHeader
          title="Welcome Back"
          subtitle="Use your email to receive a secure one-time passcode and continue to your finance dashboard."
        />

        <TextField
          label="Email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          helperText="We only use this for secure sign-in."
        />

        {error ? <InlineMessage tone="error" text={error} /> : null}

        <Button label="Request OTP" loading={loading} disabled={email.trim().length === 0} onPress={() => void handleSendOtp()} />
      </Card>
    </Screen>
  );
};
