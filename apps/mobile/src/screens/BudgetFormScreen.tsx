import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Budget, Category } from "../types";

type BudgetFormSubmit = {
  categoryId: string;
  month: string;
  amount: number;
  currency: string;
};

type BudgetFormScreenProps = {
  categories: Category[];
  initial?: Budget | null;
  month: string;
  onCancel: () => void;
  onSubmit: (payload: BudgetFormSubmit) => Promise<void>;
};

export const BudgetFormScreen = ({ categories, initial, month, onCancel, onSubmit }: BudgetFormScreenProps) => {
  const debitCategories = useMemo(() => categories.filter((category) => category.direction === "debit"), [categories]);
  const [categoryId, setCategoryId] = useState<string>(initial?.categoryId ?? debitCategories[0]?.id ?? "");
  const [monthInput, setMonthInput] = useState(initial?.month ?? month);
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [currency, setCurrency] = useState(initial?.currency ?? "INR");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!categoryId) {
      setError("Select a category.");
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthInput)) {
      setError("Month must be in YYYY-MM format.");
      return;
    }

    setError(null);

    await onSubmit({
      categoryId,
      month: monthInput,
      amount: parsedAmount,
      currency: currency.toUpperCase()
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{initial ? "Edit Budget" : "Create Budget"}</Text>

      <Text style={styles.label}>Category</Text>
      <ScrollView horizontal contentContainerStyle={styles.pillRow}>
        {debitCategories.map((item) => (
          <Pressable key={item.id} onPress={() => setCategoryId(item.id)} style={[styles.pill, categoryId === item.id && styles.pillActive]}>
            <Text style={[styles.pillText, categoryId === item.id && styles.pillTextActive]}>{item.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.label}>Month (YYYY-MM)</Text>
      <TextInput value={monthInput} onChangeText={setMonthInput} style={styles.input} />

      <Text style={styles.label}>Amount</Text>
      <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={styles.input} placeholder="0.00" />

      <Text style={styles.label}>Currency</Text>
      <TextInput value={currency} onChangeText={setCurrency} autoCapitalize="characters" maxLength={3} style={styles.input} />

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
  pillRow: {
    flexDirection: "row",
    gap: 8
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
