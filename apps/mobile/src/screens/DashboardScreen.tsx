import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ReportSummary } from "../types";

type DashboardScreenProps = {
  month: string;
  summary: ReportSummary | null;
  refreshing: boolean;
  onMonthChange: (value: string) => void;
  onApplyMonth: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onOpenTransactions: () => void;
};

const formatMoney = (value: number, currency: string): string => {
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  return `${symbol}${value.toFixed(2)}`;
};

const formatDate = (dateToken: string): string => {
  const [yearRaw, monthRaw, dayRaw] = dateToken.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const parsed = new Date(year, month - 1, day);
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />} contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Dashboard</Text>
        <Pressable style={styles.linkButton} onPress={onOpenTransactions}>
          <Text style={styles.linkText}>Transactions</Text>
        </Pressable>
      </View>

      <View style={styles.filterCard}>
        <Text style={styles.label}>Month (YYYY-MM)</Text>
        <View style={styles.filterRow}>
          <TextInput value={month} onChangeText={onMonthChange} style={styles.input} autoCapitalize="none" />
          <Pressable style={styles.applyButton} onPress={() => void onApplyMonth()}>
            <Text style={styles.applyText}>Load</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Summary</Text>
        <Text style={styles.summaryText}>Income: {formatMoney(summary?.totals.income ?? 0, currency)}</Text>
        <Text style={styles.summaryText}>Expense: {formatMoney(summary?.totals.expense ?? 0, currency)}</Text>
        <Text style={styles.summaryText}>Transfer: {formatMoney(summary?.totals.transfer ?? 0, currency)}</Text>
        <Text style={styles.summaryText}>Net Flow: {formatMoney(summary?.totals.net ?? 0, currency)}</Text>
        <Text style={styles.summaryMeta}>Transactions counted: {summary?.totals.transactionCount ?? 0}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Top Spend Categories</Text>
        {!summary || summary.topCategories.length === 0 ? (
          <Text style={styles.emptyText}>No debit transactions for this month.</Text>
        ) : null}

        {summary?.topCategories.map((category) => (
          <View key={`${category.categoryId ?? "uncategorized"}-${category.categoryName}`} style={styles.rowBetween}>
            <Text style={styles.rowLabel}>{category.categoryName}</Text>
            <Text style={styles.rowValue}>{formatMoney(category.amount, currency)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily Net Trend (Last 7 Days)</Text>
        {!summary || latestSeries.length === 0 ? <Text style={styles.emptyText}>No transaction activity in this range.</Text> : null}

        {latestSeries.map((day) => (
          <View key={day.date} style={styles.dayRow}>
            <View>
              <Text style={styles.rowLabel}>{formatDate(day.date)}</Text>
              <Text style={styles.dayMeta}>
                In {formatMoney(day.income, currency)} / Out {formatMoney(day.expense, currency)}
              </Text>
            </View>
            <Text style={[styles.netValue, day.net >= 0 ? styles.netPositive : styles.netNegative]}>{formatMoney(day.net, currency)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a"
  },
  linkButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  linkText: {
    color: "#1d4ed8",
    fontWeight: "700"
  },
  filterCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dbe5f5",
    backgroundColor: "#fff",
    padding: 12,
    gap: 8
  },
  label: {
    color: "#334155",
    fontWeight: "700"
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center"
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
    color: "#0f172a"
  },
  applyButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#1d4ed8"
  },
  applyText: {
    color: "#fff",
    fontWeight: "700"
  },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    padding: 12,
    gap: 4
  },
  summaryTitle: {
    color: "#1e3a8a",
    fontWeight: "800"
  },
  summaryText: {
    color: "#1e3a8a",
    fontWeight: "600"
  },
  summaryMeta: {
    marginTop: 4,
    color: "#1e40af",
    fontWeight: "700"
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dbe5f5",
    backgroundColor: "#fff",
    padding: 14,
    gap: 8
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a"
  },
  emptyText: {
    color: "#64748b"
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  rowLabel: {
    color: "#334155",
    fontWeight: "600"
  },
  rowValue: {
    color: "#0f172a",
    fontWeight: "700"
  },
  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  dayMeta: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2
  },
  netValue: {
    fontWeight: "800"
  },
  netPositive: {
    color: "#166534"
  },
  netNegative: {
    color: "#b91c1c"
  }
});
