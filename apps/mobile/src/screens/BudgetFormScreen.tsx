import { useMemo, useState } from "react";
import { View } from "react-native";
import { AppHeader, Button, Card, InlineMessage, Screen, SegmentedControl, TextField } from "../components/ui";
import { createStyles, theme } from "../theme";
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

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export const BudgetFormScreen = ({ categories, initial, month, onCancel, onSubmit }: BudgetFormScreenProps) => {
  const debitCategories = useMemo(() => categories.filter((category) => category.direction === "debit"), [categories]);
  const [categoryId, setCategoryId] = useState<string>(initial?.categoryId ?? debitCategories[0]?.id ?? "");
  const [monthInput, setMonthInput] = useState(initial?.month ?? month);
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [currency, setCurrency] = useState(initial?.currency ?? "INR");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    if (!MONTH_PATTERN.test(monthInput)) {
      setError("Month must be in YYYY-MM format.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await onSubmit({
        categoryId,
        month: monthInput,
        amount: parsedAmount,
        currency: currency.toUpperCase()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboardAware>
      <Card>
        <AppHeader
          title={initial ? "Edit Budget" : "Create Budget"}
          subtitle="Set monthly category caps to compare plan versus actual spending."
        />

        <SegmentedControl
          options={debitCategories.map((item) => ({ value: item.id, label: item.name }))}
          selected={categoryId}
          onSelect={setCategoryId}
        />

        <TextField
          label="Month (YYYY-MM)"
          value={monthInput}
          onChangeText={setMonthInput}
          autoCapitalize="none"
          helperText="Budgets are grouped by month token in the backend."
        />
        <TextField label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
        <TextField label="Currency" value={currency} onChangeText={setCurrency} autoCapitalize="characters" maxLength={3} />

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
