import { View } from "react-native";
import { AppHeader, Button, Card, EmptyState, InlineMessage, ListItem, Screen, StatTile, TextField } from "../components/ui";
import { createStyles, theme } from "../theme";
import { Budget } from "../types";
import { formatMoney } from "../utils/format";

type BudgetsScreenProps = {
  month: string;
  items: Budget[];
  totals: {
    budgeted: number;
    spent: number;
    remaining: number;
  };
  refreshing: boolean;
  onMonthChange: (value: string) => void;
  onApplyMonth: () => Promise<void>;
  onPreviousMonth: () => Promise<void>;
  onNextMonth: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onAdd: () => void;
  onEdit: (budget: Budget) => void;
  onDelete: (budget: Budget) => Promise<void>;
};

export const BudgetsScreen = ({
  month,
  items,
  totals,
  refreshing,
  onMonthChange,
  onApplyMonth,
  onPreviousMonth,
  onNextMonth,
  onRefresh,
  onAdd,
  onEdit,
  onDelete
}: BudgetsScreenProps) => {
  const overLimitCount = items.filter((item) => item.utilizationPercent > 100).length;
  const nearLimitCount = items.filter((item) => item.utilizationPercent >= 85 && item.utilizationPercent <= 100).length;

  return (
    <Screen refreshing={refreshing} onRefresh={() => void onRefresh()}>
      <AppHeader
        title="Budgets"
        subtitle="Set monthly spend goals and compare planned vs actual outcomes."
        rightSlot={<Button label="Add" onPress={onAdd} />}
      />

      <Card variant="muted">
        <View style={styles.monthNavRow}>
          <Button label="Prev" variant="ghost" onPress={() => void onPreviousMonth()} style={styles.navButton} />
          <TextField label="Month (YYYY-MM)" value={month} onChangeText={onMonthChange} autoCapitalize="none" containerStyle={styles.monthField} />
          <Button label="Next" variant="ghost" onPress={() => void onNextMonth()} style={styles.navButton} />
        </View>
        <Button label="Load Month" variant="secondary" onPress={() => void onApplyMonth()} />
      </Card>

      {overLimitCount > 0 ? (
        <InlineMessage tone="error" text={`${overLimitCount} budget ${overLimitCount === 1 ? "is" : "are"} over 100% utilization this month.`} />
      ) : null}

      {overLimitCount === 0 && nearLimitCount > 0 ? (
        <InlineMessage tone="warn" text={`${nearLimitCount} budget ${nearLimitCount === 1 ? "is" : "are"} above 85% utilization.`} />
      ) : null}

      <View style={styles.statGrid}>
        <StatTile label="Budgeted" value={formatMoney(totals.budgeted, "INR")} tone="info" />
        <StatTile label="Spent" value={formatMoney(totals.spent, "INR")} tone="negative" />
        <StatTile label="Remaining" value={formatMoney(totals.remaining, "INR")} tone="positive" />
      </View>

      {items.length === 0 ? (
        <EmptyState title="No budgets for this month" description="Create category budgets to track plan vs actual spend." />
      ) : null}

      {items.map((item) => (
        <ListItem
          key={item.id}
          title={item.categoryName}
          subtitle={`Utilization: ${item.utilizationPercent.toFixed(2)}%`}
          detail={`Planned ${formatMoney(item.amount, item.currency)} | Spent ${formatMoney(item.spentAmount, item.currency)} | Remaining ${formatMoney(item.remainingAmount, item.currency)}`}
        >
          <View style={styles.actionRow}>
            <Button label="Edit" variant="secondary" onPress={() => onEdit(item)} style={styles.flexAction} />
            <Button label="Delete" variant="danger" onPress={() => void onDelete(item)} style={styles.flexAction} />
          </View>
        </ListItem>
      ))}
    </Screen>
  );
};

const styles = createStyles(() => ({
  monthNavRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    alignItems: "flex-end"
  },
  monthField: {
    flex: 1
  },
  navButton: {
    minWidth: 82
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  actionRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  flexAction: {
    flex: 1
  }
}));
