import { useMemo, useState } from "react";
import { View } from "react-native";
import { AppHeader, Button, Card, InlineMessage, Screen, SegmentedControl, TextField } from "../components/ui";
import { canSubmitTransaction } from "../flow/mobileFlow";
import { createStyles, theme } from "../theme";
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
  const [loading, setLoading] = useState(false);

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
    setLoading(true);

    try {
      await onSubmit({
        categoryId,
        direction,
        amount: parsedAmount,
        currency: currency.toUpperCase(),
        counterparty: counterparty.trim(),
        note: note.trim(),
        occurredAt: new Date(occurredAt).toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = [
    { value: "none", label: "Uncategorized" },
    ...eligibleCategories.map((item) => ({ value: item.id, label: item.name }))
  ];

  return (
    <Screen keyboardAware>
      <Card>
        <AppHeader
          title={initial ? "Edit Transaction" : "Add Transaction"}
          subtitle="Capture reliable financial events with category and timestamp context."
        />

        <SegmentedControl
          options={[
            { value: "debit", label: "Debit" },
            { value: "credit", label: "Credit" },
            { value: "transfer", label: "Transfer" }
          ]}
          selected={direction}
          onSelect={(value) => setDirection(value)}
        />

        <TextField label="Amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="0.00" />
        <TextField label="Currency" value={currency} onChangeText={setCurrency} autoCapitalize="characters" maxLength={3} />

        <SegmentedControl
          options={categoryOptions}
          selected={categoryId ?? "none"}
          onSelect={(value) => setCategoryId(value === "none" ? null : value)}
        />

        <TextField label="Counterparty" value={counterparty} onChangeText={setCounterparty} placeholder="Merchant or person" />
        <TextField label="Notes" value={note} onChangeText={setNote} multiline />
        <TextField
          label="Date/Time (ISO)"
          value={occurredAt}
          onChangeText={setOccurredAt}
          placeholder="2026-03-11T19:20:00"
          helperText="Store precise event time for analytics and summaries."
        />

        {error ? <InlineMessage tone="error" text={error} /> : null}

        <View style={styles.actionRow}>
          <Button label="Cancel" variant="ghost" onPress={onCancel} style={styles.flexAction} />
          <Button label={initial ? "Save" : "Create"} onPress={() => void handleSubmit()} loading={loading} style={styles.flexAction} />
        </View>
      </Card>
    </Screen>
  );
};

const styles = createStyles(() => ({
  actionRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  flexAction: {
    flex: 1
  }
}));
