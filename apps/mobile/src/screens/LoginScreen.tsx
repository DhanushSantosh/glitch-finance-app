import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

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
      setError(requestError instanceof Error ? requestError.message : "Unable to request OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in to Quantex25</Text>
      <Text style={styles.subtitle}>Use your email to receive a secure one-time passcode.</Text>

      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="you@example.com"
        placeholderTextColor="#7c8aa5"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        onPress={() => void handleSendOtp()}
        disabled={loading || email.trim().length === 0}
        style={[styles.button, (loading || email.trim().length === 0) && styles.buttonDisabled]}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Request OTP</Text>}
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
    fontSize: 16,
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
  errorText: {
    color: "#b91c1c",
    fontWeight: "600"
  }
});
