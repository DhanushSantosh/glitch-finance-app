import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

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
      setError(verifyError instanceof Error ? verifyError.message : "Unable to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>We sent a 6-digit code to {email}</Text>

      <TextInput
        keyboardType="number-pad"
        maxLength={6}
        placeholder="123456"
        placeholderTextColor="#7c8aa5"
        style={styles.input}
        value={code}
        onChangeText={setCode}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable onPress={() => void handleVerify()} disabled={loading || code.length !== 6} style={[styles.button, (loading || code.length !== 6) && styles.buttonDisabled]}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify and Continue</Text>}
      </Pressable>

      <Pressable onPress={onBack} style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>Change email</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 14,
    padding: 20,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderColor: "#dbe5f5",
    borderWidth: 1
  },
  title: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "800"
  },
  subtitle: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 24,
    letterSpacing: 6,
    color: "#0f172a"
  },
  button: {
    marginTop: 8,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center"
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700"
  },
  secondaryButton: {
    alignItems: "center"
  },
  secondaryText: {
    color: "#2563eb",
    fontWeight: "700"
  },
  errorText: {
    color: "#b91c1c",
    fontWeight: "600"
  }
});
