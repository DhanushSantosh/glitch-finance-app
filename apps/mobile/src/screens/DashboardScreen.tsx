import { Text, View } from "react-native";
import { AppHeader, Button, Card, EmptyState, ListItem, Screen, StatTile, TextField } from "../components/ui";
import { createStyles, theme } from "../theme";
import { ReportSummary } from "../types";
import { formatDateToken, formatMoney } from "../utils/format";

type DashboardScreenProps = {
  month: string;
  summary: ReportSummary | null;
  refreshing: boolean;
  onMonthChange: (value: string) => void;
  onApplyMonth: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onOpenTransactions: () => void;
};

export const DashboardScreen = ({
  month,
  summary,
  refreshing,
  onMonthChange,
  onApplyMonth,
  onRefresh,
  onOpenTransactions
}: DashboardScreenProps) => {
  const currency = summary?.totals.currency ?? "INR";
  const latestSeries = summary?.dailySeries.slice(-7) ?? [];

  return (
    <Screen refreshing={refreshing} onRefresh={() => void onRefresh()}>
      <AppHeader
        title="Dashboard"
        subtitle="Quickly review cash flow, top categories, and weekly movement."
        rightSlot={<Button label="Transactions" variant="secondary" onPress={onOpenTransactions} />}
      />

      <Card variant="muted">
        <TextField
          label="Month (YYYY-MM)"
          value={month}
          onChangeText={onMonthChange}
          autoCapitalize="none"
          helperText="Use monthly snapshots to track trend quality over time."
        />
        <Button label="Load Summary" variant="secondary" onPress={() => void onApplyMonth()} />
      </Card>

      <View style={styles.statGrid}>
        <StatTile label="Income" value={formatMoney(summary?.totals.income ?? 0, currency)} tone="positive" />
        <StatTile label="Expense" value={formatMoney(summary?.totals.expense ?? 0, currency)} tone="negative" />
        <StatTile label="Transfer" value={formatMoney(summary?.totals.transfer ?? 0, currency)} tone="info" />
        <StatTile label="Net Flow" value={formatMoney(summary?.totals.net ?? 0, currency)} tone={(summary?.totals.net ?? 0) >= 0 ? "positive" : "negative"} />
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Top Spend Categories</Text>
        {!summary || summary.topCategories.length === 0 ? (
          <EmptyState
            title="No debit transactions yet"
            description="Once you add debit entries, your top spending categories will appear here."
          />
        ) : null}

        {summary?.topCategories.map((category) => (
          <ListItem
            key={`${category.categoryId ?? "uncategorized"}-${category.categoryName}`}
            title={category.categoryName}
            subtitle={`${category.transactionCount} transactions`}
            trailing={<Text style={styles.trailingAmount}>{formatMoney(category.amount, currency)}</Text>}
          />
        ))}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Daily Net Trend (Last 7 Days)</Text>
        {!summary || latestSeries.length === 0 ? (
          <EmptyState
            title="No daily trend yet"
            description="Add transactions this month to unlock your daily net movement trend."
          />
        ) : null}

        {latestSeries.map((day) => {
          const netPositive = day.net >= 0;

          return (
            <ListItem
              key={day.date}
              title={formatDateToken(day.date)}
              subtitle={`In ${formatMoney(day.income, currency)} / Out ${formatMoney(day.expense, currency)}`}
              trailing={<Text style={[styles.trailingAmount, netPositive ? styles.netPositive : styles.netNegative]}>{formatMoney(day.net, currency)}</Text>}
            />
          );
        })}
      </Card>
    </Screen>
  );
};

const styles = createStyles(() => ({
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  sectionTitle: {
    color: theme.color.textPrimary,
    fontSize: theme.typography.heading,
    fontWeight: "800"
  },
  trailingAmount: {
    color: theme.color.textPrimary,
    fontSize: theme.typography.bodySmall,
    fontWeight: "700"
  },
  netPositive: {
    color: theme.color.statusSuccess
  },
  netNegative: {
    color: theme.color.statusError
  }
}));
