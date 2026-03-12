import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Goal } from "../types";

type GoalFormSubmit = {
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  targetDate: string | null;
};

type GoalFormScreenProps = {
  initial?: Goal | null;
  onCancel: () => void;
  onSubmit: (payload: GoalFormSubmit) => Promise<void>;
};

export const GoalFormScreen = ({ initial, onCancel, onSubmit }: GoalFormScreenProps) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(initial ? String(initial.targetAmount) : "");
  const [currentAmount, setCurrentAmount] = useState(initial ? String(initial.currentAmount) : "0");
  const [currency, setCurrency] = useState(initial?.currency ?? "INR");
  const [targetDate, setTargetDate] = useState(initial?.targetDate ? initial.targetDate.slice(0, 10) : "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (name.trim().length < 2) {
      setError("Enter a goal name.");
      return;
    }

    const parsedTarget = Number(targetAmount);
    const parsedCurrent = Number(currentAmount);

    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setError("Enter a valid target amount.");
      return;
    }

    if (!Number.isFinite(parsedCurrent) || parsedCurrent < 0) {
      setError("Enter a valid current amount.");
      return;
    }

    if (targetDate && Number.isNaN(new Date(targetDate).getTime())) {
      setError("Target date must be a valid date.");
      return;
    }

    setError(null);

    await onSubmit({
      name: name.trim(),
      targetAmount: parsedTarget,
      currentAmount: parsedCurrent,
      currency: currency.toUpperCase(),
      targetDate: targetDate ? new Date(targetDate).toISOString() : null
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{initial ? "Edit Goal" : "Create Goal"}</Text>

      <Text style={styles.label}>Goal name</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Emergency Fund" />

      <Text style={styles.label}>Target amount</Text>
      <TextInput value={targetAmount} onChangeText={setTargetAmount} keyboardType="decimal-pad" style={styles.input} placeholder="50000" />

      <Text style={styles.label}>Current amount</Text>
      <TextInput value={currentAmount} onChangeText={setCurrentAmount} keyboardType="decimal-pad" style={styles.input} placeholder="0" />

      <Text style={styles.label}>Currency</Text>
      <TextInput value={currency} onChangeText={setCurrency} autoCapitalize="characters" maxLength={3} style={styles.input} />

      <Text style={styles.label}>Target date (optional: YYYY-MM-DD)</Text>
      <TextInput value={targetDate} onChangeText={setTargetDate} style={styles.input} placeholder="2026-12-31" />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Pressable style={styles.secondaryButton} onPress={onCancel}>
          <Text style={styles.secondaryText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={() => void handleSubmit()}>
          <Text style={styles.primaryText}>{initial ? "Save" : "Create"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 8
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6
  },
  label: {
    marginTop: 8,
    color: "#334155",
    fontWeight: "700"
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    color: "#0f172a"
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff"
  },
  secondaryText: {
    color: "#334155",
    fontWeight: "700"
  },
  primaryButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#2563eb"
  },
  primaryText: {
    color: "#fff",
    fontWeight: "700"
  },
  error: {
    color: "#b91c1c",
    fontWeight: "600",
    marginTop: 8
  }
});
