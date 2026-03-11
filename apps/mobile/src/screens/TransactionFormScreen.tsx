import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { canSubmitTransaction } from "../flow/mobileFlow";
import { Category, Transaction, TransactionDirection } from "../types";

type TransactionFormSubmit = {
  categoryId: string | null;
  direction: TransactionDirection;
  amount: number;
  currency: string;
  counterparty: string;
  note: string;
  occurredAt: string;
};

type TransactionFormScreenProps = {
  categories: Category[];
  initial?: Transaction | null;
  onCancel: () => void;
  onSubmit: (payload: TransactionFormSubmit) => Promise<void>;
};

export const TransactionFormScreen = ({ categories, initial, onCancel, onSubmit }: TransactionFormScreenProps) => {
  const [direction, setDirection] = useState<TransactionDirection>(initial?.direction ?? "debit");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [currency, setCurrency] = useState(initial?.currency ?? "INR");
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [counterparty, setCounterparty] = useState(initial?.counterparty ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [occurredAt, setOccurredAt] = useState(initial ? initial.occurredAt.slice(0, 19) : new Date().toISOString().slice(0, 19));
  const [error, setError] = useState<string | null>(null);

  const eligibleCategories = useMemo(
    () => categories.filter((category) => category.direction === direction || category.direction === "transfer"),
    [categories, direction]
  );

  const handleSubmit = async () => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    if (!canSubmitTransaction(String(parsedAmount), occurredAt)) {
      setError("Enter a valid date/time in ISO format (YYYY-MM-DDTHH:mm:ss).");
      return;
    }
    
    setError(null);

    await onSubmit({
      categoryId,
      direction,
      amount: parsedAmount,
      currency: currency.toUpperCase(),
      counterparty: counterparty.trim(),
      note: note.trim(),
      occurredAt: new Date(occurredAt).toISOString()
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{initial ? "Edit Transaction" : "Add Transaction"}</Text>

      <Text style={styles.label}>Direction</Text>
      <View style={styles.pillRow}>
        {(["debit", "credit", "transfer"] as const).map((item) => (
          <Pressable key={item} onPress={() => setDirection(item)} style={[styles.pill, direction === item && styles.pillActive]}>
            <Text style={[styles.pillText, direction === item && styles.pillTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Amount</Text>
      <TextInput keyboardType="decimal-pad" value={amount} onChangeText={setAmount} style={styles.input} placeholder="0.00" />

      <Text style={styles.label}>Currency</Text>
      <TextInput value={currency} onChangeText={setCurrency} style={styles.input} autoCapitalize="characters" maxLength={3} />

      <Text style={styles.label}>Category</Text>
      <ScrollView horizontal contentContainerStyle={styles.pillRow}>
        <Pressable onPress={() => setCategoryId(null)} style={[styles.pill, categoryId === null && styles.pillActive]}>
          <Text style={[styles.pillText, categoryId === null && styles.pillTextActive]}>Uncategorized</Text>
        </Pressable>
        {eligibleCategories.map((item) => (
          <Pressable key={item.id} onPress={() => setCategoryId(item.id)} style={[styles.pill, categoryId === item.id && styles.pillActive]}>
            <Text style={[styles.pillText, categoryId === item.id && styles.pillTextActive]}>{item.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.label}>Counterparty</Text>
      <TextInput value={counterparty} onChangeText={setCounterparty} style={styles.input} placeholder="Merchant or person" />

      <Text style={styles.label}>Notes</Text>
      <TextInput value={note} onChangeText={setNote} style={[styles.input, styles.textArea]} multiline />

      <Text style={styles.label}>Date/Time (ISO)</Text>
      <TextInput value={occurredAt} onChangeText={setOccurredAt} style={styles.input} placeholder="2026-03-11T19:20:00" />

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
  textArea: {
    minHeight: 72,
    textAlignVertical: "top"
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  pill: {
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20
  },
  pillActive: {
    borderColor: "#1d4ed8",
    backgroundColor: "#1d4ed8"
  },
  pillText: {
    color: "#1d4ed8",
    fontWeight: "700"
  },
  pillTextActive: {
    color: "#fff"
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
