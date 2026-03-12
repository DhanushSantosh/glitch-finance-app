import { useState } from "react";
import { AppHeader, Button, Card, InlineMessage, Screen, TextField } from "../components/ui";

type OtpVerifyScreenProps = {
  email: string;
  onBack: () => void;
  onVerify: (code: string) => Promise<void>;
};

export const OtpVerifyScreen = ({ email, onBack, onVerify }: OtpVerifyScreenProps) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    try {
      setLoading(true);
      setError(null);
      await onVerify(code);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Unable to verify OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboardAware>
      <Card>
        <AppHeader title="Verify OTP" subtitle={`Enter the 6-digit code sent to ${email}.`} />

        <InlineMessage tone="info" text="Development mode: OTP is shown in API logs and debug alert." />

        <TextField
          label="One-time passcode"
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={setCode}
          placeholder="123456"
          textContentType="oneTimeCode"
        />

        {error ? <InlineMessage tone="error" text={error} /> : null}

        <Button label="Verify and Continue" loading={loading} disabled={code.length !== 6} onPress={() => void handleVerify()} />
        <Button label="Change Email" variant="ghost" onPress={onBack} />
      </Card>
    </Screen>
  );
};
