import { useState } from "react";
import { View, Text } from "react-native";
import { AppHeader, Button, Card, publishToast, Screen, TextField } from "../components/ui";
import { createStyles, theme } from "../theme";
import { Goal } from "../types";
import { Check, X, Target, Wallet, Clock, BarChart3 } from "lucide-react-native";

type GoalFormSubmit = {
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  targetDate: string | null;
};

type GoalFormScreenProps = {
  initial?: Goal | null;
  defaultCurrency: string;
  onCancel: () => void;
  onSubmit: (payload: GoalFormSubmit) => Promise<void>;
};

export const GoalFormScreen = ({ initial, defaultCurrency, onCancel, onSubmit }: GoalFormScreenProps) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(initial ? String(initial.targetAmount) : "");
  const [currentAmount, setCurrentAmount] = useState(initial ? String(initial.currentAmount) : "0");
  const [currency, setCurrency] = useState(initial?.currency ?? defaultCurrency);
  const [targetDate, setTargetDate] = useState(initial?.targetDate ? initial.targetDate.slice(0, 10) : "");
  const [loading, setLoading] = useState(false);

  const resolveMessage = (input: unknown, fallback: string): string =>
    input instanceof Error && input.message.trim().length > 0 ? input.message : fallback;

  const handleSubmit = async () => {
    if (name.trim().length < 2) {
      publishToast({
        tone: "error",
        title: "Goal",
        message: "Enter a valid objective name."
      });
      return;
    }

    const parsedTarget = Number(targetAmount);
    const parsedCurrent = Number(currentAmount);

    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      publishToast({
        tone: "error",
        title: "Goal",
        message: "Enter a valid target amount."
      });
      return;
    }

    if (!Number.isFinite(parsedCurrent) || parsedCurrent < 0) {
      publishToast({
        tone: "error",
        title: "Goal",
        message: "Enter a valid current amount."
      });
      return;
    }

    if (targetDate && Number.isNaN(new Date(targetDate).getTime())) {
      publishToast({
        tone: "error",
        title: "Goal",
        message: "Target date must be a valid date."
      });
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        name: name.trim(),
        targetAmount: parsedTarget,
        currentAmount: parsedCurrent,
        currency: currency.toUpperCase(),
        targetDate: targetDate ? new Date(targetDate).toISOString() : null
      });
    } catch (submitError) {
      publishToast({
        tone: "error",
        title: "Goal",
        message: resolveMessage(submitError, "Unable to save goal right now.")
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboardAware>
      <AppHeader
        title={initial ? "Modify Objective" : "New Objective"}
        subtitle="Define capital accumulation parameters."
      />

      <Card variant="glass" style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.titleRow}>
            <Wallet size={18} color={theme.color.actionPrimary} />
            <Text style={styles.sectionTitle}>CAPITAL TARGET</Text>
          </View>
        </View>

        <View style={styles.amountRow}>
          <TextField 
            label="TARGET AMOUNT" 
            value={targetAmount} 
            onChangeText={setTargetAmount} 
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
            <Text style={styles.sectionTitle}>IDENTIFICATION</Text>
          </View>
        </View>

        <TextField 
          label="OBJECTIVE NAME" 
          value={name} 
          onChangeText={setName} 
          placeholder="e.g. Emergency Fund" 
        />
      </Card>

      <Card variant="muted" style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.titleRow}>
            <BarChart3 size={18} color={theme.color.textMuted} />
            <Text style={styles.sectionTitle}>STATUS & TIMELINE</Text>
          </View>
        </View>

        <TextField 
          label="CURRENT BALANCE" 
          value={currentAmount} 
          onChangeText={setCurrentAmount} 
          keyboardType="decimal-pad" 
          placeholder="0" 
        />
        <TextField
          label="DEADLINE (OPTIONAL)"
          value={targetDate}
          onChangeText={setTargetDate}
          autoCapitalize="none"
          placeholder="YYYY-MM-DD"
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
    flex: 3,
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
