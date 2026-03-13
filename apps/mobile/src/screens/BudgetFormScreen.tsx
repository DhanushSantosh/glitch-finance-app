import { useMemo, useState } from "react";
import { View, Text } from "react-native";
import { AppHeader, Button, Card, InlineMessage, Screen, TextField } from "../components/ui";
import { createStyles, theme } from "../theme";
import { Budget, Category } from "../types";
import { Check, X, Target, CalendarDays, Wallet } from "lucide-react-native";

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
      setError("Select a target category.");
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid non-zero allocation limit.");
      return;
    }

    if (!MONTH_PATTERN.test(monthInput)) {
      setError("Cycle must be in YYYY-MM format.");
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
      <AppHeader
        title={initial ? "Modify Allocation" : "New Allocation"}
        subtitle="Establish capital constraints and monitor burn rates."
      />

      {error ? <InlineMessage tone="error" text={error} /> : null}

      <Card variant="glass" style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.titleRow}>
            <Wallet size={18} color={theme.color.actionPrimary} />
            <Text style={styles.sectionTitle}>CAPITAL LIMIT</Text>
          </View>
        </View>

        <View style={styles.amountRow}>
          <TextField 
            label="AMOUNT" 
            value={amount} 
            onChangeText={setAmount} 
            keyboardType="decimal-pad" 
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
            <Target size={18} color={theme.color.textMuted} />
            <Text style={styles.sectionTitle}>TARGET CATEGORY</Text>
          </View>
        </View>

        <View style={styles.categoryList}>
          <View style={styles.categoryGrid}>
            {debitCategories.map((item) => {
              const active = item.id === categoryId;
              return (
                <View 
                  key={item.id} 
                  style={styles.categoryItemWrap}
                >
                  <Button
                    label={item.name}
                    variant={active ? "primary" : "ghost"}
                    onPress={() => setCategoryId(item.id)}
                    style={[styles.categoryBtn, active ? styles.categoryBtnActive : null]}
                  />
                </View>
              );
            })}
            {debitCategories.length === 0 && (
              <Text style={styles.emptyText}>No debit categories available to budget.</Text>
            )}
          </View>
        </View>
      </Card>

      <Card variant="muted" style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.titleRow}>
            <CalendarDays size={18} color={theme.color.textMuted} />
            <Text style={styles.sectionTitle}>TIME HORIZON</Text>
          </View>
        </View>

        <TextField
          label="CYCLE (YYYY-MM)"
          value={monthInput}
          onChangeText={setMonthInput}
          autoCapitalize="none"
          placeholder="2026-03"
          helperText="Allocations are strictly bound to monthly cycles."
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
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -1.5,
    minHeight: 64
  },
  currencyInput: {
    textAlign: "center",
    fontWeight: "800",
    letterSpacing: 2,
    minHeight: 64
  },
  categoryList: {
    gap: theme.spacing.sm,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  categoryItemWrap: {
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
  },
  emptyText: {
    color: theme.color.textMuted,
    fontSize: theme.typography.bodySmall,
    fontStyle: "italic"
  },
  actionRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl
  },
  flexAction: {
    flex: 1,
    minHeight: 56
  }
}));
