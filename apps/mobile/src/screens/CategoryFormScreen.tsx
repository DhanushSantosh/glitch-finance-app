import { useState } from "react";
import { View } from "react-native";
import { AppHeader, Button, Card, InlineMessage, Screen, SegmentedControl, TextField } from "../components/ui";
import { createStyles, theme } from "../theme";
import { Category, TransactionDirection } from "../types";

type CategoryFormSubmit = {
  name: string;
  direction: TransactionDirection;
};

type CategoryFormScreenProps = {
  initial?: Category | null;
  onCancel: () => void;
  onSubmit: (payload: CategoryFormSubmit) => Promise<void>;
};

export const CategoryFormScreen = ({ initial, onCancel, onSubmit }: CategoryFormScreenProps) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [direction, setDirection] = useState<TransactionDirection>(initial?.direction ?? "debit");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const normalizedName = name.trim();
    if (normalizedName.length < 2) {
      setError("Category name must be at least 2 characters.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await onSubmit({
        name: normalizedName,
        direction
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboardAware>
      <Card>
        <AppHeader title={initial ? "Edit Category" : "Create Category"} subtitle="Define your own category taxonomy." />

        <TextField label="Category Name" value={name} onChangeText={setName} placeholder="e.g. Rent, Freelance, Investments" />

        <SegmentedControl
          label="Direction"
          options={[
            { value: "debit", label: "Debit" },
            { value: "credit", label: "Credit" },
            { value: "transfer", label: "Transfer" }
          ]}
          selected={direction}
          onSelect={setDirection}
        />

        {error ? <InlineMessage tone="error" text={error} /> : null}

        <View style={styles.actionRow}>
          <Button label="Cancel" variant="ghost" onPress={onCancel} style={styles.flexAction} />
          <Button label={initial ? "Save Category" : "Create Category"} onPress={() => void handleSubmit()} loading={loading} style={styles.flexAction} />
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

