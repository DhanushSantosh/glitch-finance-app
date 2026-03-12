import { useState } from "react";
import { View } from "react-native";
import { AppHeader, Button, Card, InlineMessage, Screen, TextField } from "../components/ui";
import { createStyles, theme } from "../theme";
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
  const [loading, setLoading] = useState(false);

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
    setLoading(true);

    try {
      await onSubmit({
        name: name.trim(),
        targetAmount: parsedTarget,
        currentAmount: parsedCurrent,
        currency: currency.toUpperCase(),
        targetDate: targetDate ? new Date(targetDate).toISOString() : null
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboardAware>
      <Card>
        <AppHeader
          title={initial ? "Edit Goal" : "Create Goal"}
          subtitle="Capture target, current value, and optional completion date for progress tracking."
        />

        <TextField label="Goal Name" value={name} onChangeText={setName} placeholder="Emergency Fund" />
        <TextField label="Target Amount" value={targetAmount} onChangeText={setTargetAmount} keyboardType="decimal-pad" placeholder="50000" />
        <TextField label="Current Amount" value={currentAmount} onChangeText={setCurrentAmount} keyboardType="decimal-pad" placeholder="0" />
        <TextField label="Currency" value={currency} onChangeText={setCurrency} autoCapitalize="characters" maxLength={3} />
        <TextField
          label="Target Date (Optional: YYYY-MM-DD)"
          value={targetDate}
          onChangeText={setTargetDate}
          autoCapitalize="none"
          placeholder="2026-12-31"
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
