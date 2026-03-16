import { useMemo, useState } from "react";
import { View, Text } from "react-native";
import { AppHeader, Button, Card, publishToast, Screen, SegmentedControl, TextField } from "../components/ui";
import { canSubmitTransaction } from "../flow/mobileFlow";
import { createStyles, theme } from "../theme";
import { Category, Transaction, TransactionDirection } from "../types";
import { Check, X, Wallet, Tag, Clock } from "lucide-react-native";

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
  defaultCurrency: string;
  onCancel: () => void;
  onSubmit: (payload: TransactionFormSubmit) => Promise<void>;
};

export const TransactionFormScreen = ({ categories, initial, defaultCurrency, onCancel, onSubmit }: TransactionFormScreenProps) => {
  const [direction, setDirection] = useState<TransactionDirection>(initial?.direction ?? "debit");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [currency, setCurrency] = useState(initial?.currency ?? defaultCurrency);
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [counterparty, setCounterparty] = useState(initial?.counterparty ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [occurredAt, setOccurredAt] = useState(initial ? initial.occurredAt.slice(0, 19) : new Date().toISOString().slice(0, 19));
  const [loading, setLoading] = useState(false);

  const resolveMessage = (input: unknown, fallback: string): string =>
    input instanceof Error && input.message.trim().length > 0 ? input.message : fallback;

  const eligibleCategories = useMemo(
    () => categories.filter((category) => category.direction === direction || category.direction === "transfer"),
    [categories, direction]
  );

  const handleSubmit = async () => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      publishToast({
        tone: "error",
        title: "Transaction",
        message: "Enter a valid non-zero amount."
      });
      return;
    }

    if (!canSubmitTransaction(String(parsedAmount), occurredAt)) {
      publishToast({
        tone: "error",
        title: "Transaction",
        message: "Enter a valid date/time in ISO format (YYYY-MM-DDTHH:mm:ss)."
      });
      return;
    }

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
    } catch (submitError) {
      publishToast({
        tone: "error",
        title: "Transaction",
        message: resolveMessage(submitError, "Unable to save transaction right now.")
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
      <AppHeader
        title={initial ? "Modify Entry" : "New Entry"}
        subtitle="Record transaction telemetry."
      />

      <Card variant="glass" style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.titleRow}>
            <Wallet size={18} color={theme.color.actionPrimary} />
            <Text style={styles.sectionTitle}>VALUE METRICS</Text>
          </View>
        </View>

        <SegmentedControl
          label="DIRECTION"
          options={[
            { value: "debit", label: "Debit" },
            { value: "credit", label: "Credit" },
            { value: "transfer", label: "Transfer" }
          ]}
          selected={direction}
          onSelect={(value) => setDirection(value as TransactionDirection)}
        />

        <View style={styles.amountRow}>
          <TextField 
            label="AMOUNT" 
            keyboardType="decimal-pad" 
            value={amount} 
            onChangeText={setAmount} 
            placeholder="0.00" 
            containerStyle={styles.amountField}
            style={styles.amountInput}
          />
          <TextField 
            label="CUR" 
            value={currency} 
            onChangeText={setCurrency} 
            autoCapitalize="characters" 
            maxLength={3} 
            containerStyle={styles.currencyField}
            style={styles.currencyInput}
          />
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.titleRow}>
            <Tag size={18} color={theme.color.textMuted} />
            <Text style={styles.sectionTitle}>CLASSIFICATION</Text>
          </View>
        </View>

        <View style={styles.categoryList}>
          <Text style={styles.groupLabel}>CATEGORY</Text>
          <View style={styles.categoryGrid}>
            {categoryOptions.map((option) => {
              const active = option.value === (categoryId ?? "none");
              return (
                <View 
                  key={option.value} 
                  style={styles.categoryItemWrap}
                >
                  <Button
                    label={option.label}
                    variant={active ? "primary" : "ghost"}
                    onPress={() => setCategoryId(option.value === "none" ? null : option.value)}
                    style={[styles.categoryBtn, active ? styles.categoryBtnActive : null]}
                  />
                </View>
              );
            })}
          </View>
        </View>

        <TextField 
          label="COUNTERPARTY" 
          value={counterparty} 
          onChangeText={setCounterparty} 
          placeholder="Merchant, person, or institution" 
        />
      </Card>

      <Card variant="muted" style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.titleRow}>
            <Clock size={18} color={theme.color.textMuted} />
            <Text style={styles.sectionTitle}>METADATA</Text>
          </View>
        </View>

        <TextField
          label="TIMESTAMP (ISO)"
          value={occurredAt}
          onChangeText={setOccurredAt}
          placeholder="YYYY-MM-DDTHH:mm:ss"
          helperText="Precise event timing."
        />
        
        <TextField 
          label="NOTES" 
          value={note} 
          onChangeText={setNote} 
          multiline 
          placeholder="Optional context..."
          style={styles.textArea}
        />
      </Card>

      <View style={styles.actionRow}>
        <Button 
          label={
            <>
              <X size={20} color={theme.color.textPrimary} />
              <Text style={{color: theme.color.textPrimary, fontWeight: '700'}}>DISCARD</Text>
            </>
          } 
          variant="ghost" 
          onPress={onCancel} 
          style={styles.flexAction} 
        />
        <Button 
          label={
            <>
              <Check size={20} color={theme.color.textInverse} />
              <Text style={{color: theme.color.textInverse, fontWeight: '800'}}>COMMIT</Text>
            </>
          } 
          variant="primary" 
          onPress={() => void handleSubmit()} 
          loading={loading} 
          style={styles.flexAction} 
        />
      </View>
    </Screen>
  );
};

const styles = createStyles(() => ({
  sectionCard: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md
  },
  sectionHeader: {
    marginBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.borderSubtle,
    paddingBottom: theme.spacing.sm
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  sectionTitle: {
    color: theme.color.textPrimary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2
  },
  amountRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    alignItems: "flex-end"
  },
  amountField: {
    flex: 2,
    marginBottom: 0
  },
  currencyField: {
    flex: 1,
    marginBottom: 0
  },
  amountInput: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -1
  },
  currencyInput: {
    textAlign: "center",
    fontWeight: "800",
    letterSpacing: 2
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top"
  },
  actionRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl // Extra padding for safety
  },
  flexAction: {
    flex: 1,
    minHeight: 56
  },
  categoryList: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md
  },
  groupLabel: {
    color: theme.color.textSecondary,
    fontSize: theme.typography.label,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: theme.spacing.xs
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  categoryItemWrap: {
    // Allows buttons to size to their content naturally, wrapping to new lines
    alignSelf: "flex-start" 
  },
  categoryBtn: {
    minHeight: 36,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.color.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.color.borderSubtle
  },
  categoryBtnActive: {
    backgroundColor: theme.color.actionPrimary,
    borderColor: theme.color.actionPrimary,
    shadowColor: theme.color.actionPrimary,
    shadowOpacity: 0.3
  }
}));
