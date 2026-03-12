import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Budget } from "../types";

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
  onRefresh: () => Promise<void>;
  onAdd: () => void;
  onEdit: (budget: Budget) => void;
  onDelete: (budget: Budget) => Promise<void>;
};

const formatMoney = (value: number, currency: string): string => {
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  return `${symbol}${value.toFixed(2)}`;
};

export const BudgetsScreen = ({
  month,
  items,
  totals,
  refreshing,
  onMonthChange,
  onApplyMonth,
  onRefresh,
  onAdd,
  onEdit,
  onDelete
}: BudgetsScreenProps) => {
  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />} contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Budgets</Text>
        <Pressable style={styles.addButton} onPress={onAdd}>
          <Text style={styles.addButtonText}>Add Budget</Text>
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
        <Text style={styles.summaryText}>Budgeted: {formatMoney(totals.budgeted, "INR")}</Text>
        <Text style={styles.summaryText}>Spent: {formatMoney(totals.spent, "INR")}</Text>
        <Text style={styles.summaryText}>Remaining: {formatMoney(totals.remaining, "INR")}</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No budgets for this month</Text>
          <Text style={styles.emptySubtitle}>Create a category budget to track plan vs actual spend.</Text>
        </View>
      ) : null}

      {items.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.category}>{item.categoryName}</Text>
            <Text style={styles.utilization}>{item.utilizationPercent.toFixed(2)}%</Text>
          </View>
          <Text style={styles.meta}>Planned: {formatMoney(item.amount, item.currency)}</Text>
          <Text style={styles.meta}>Spent: {formatMoney(item.spentAmount, item.currency)}</Text>
          <Text style={styles.meta}>Remaining: {formatMoney(item.remainingAmount, item.currency)}</Text>

          <View style={styles.actionRow}>
            <Pressable style={styles.actionButton} onPress={() => onEdit(item)}>
              <Text style={styles.actionText}>Edit</Text>
            </Pressable>
            <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={() => void onDelete(item)}>
              <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
            </Pressable>
          </View>
        </View>
      ))}
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
  addButton: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14
  },
  addButtonText: {
    color: "#fff",
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
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dbe5f5",
    backgroundColor: "#fff",
    padding: 16,
    gap: 6
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b"
  },
  emptySubtitle: {
    color: "#475569"
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dbe5f5",
    backgroundColor: "#fff",
    padding: 14,
    gap: 6
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  category: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a"
  },
  utilization: {
    color: "#1e40af",
    fontWeight: "700"
  },
  meta: {
    color: "#475569"
  },
  actionRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 8
  },
  actionButton: {
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8
  },
  actionText: {
    color: "#1d4ed8",
    fontWeight: "700"
  },
  deleteButton: {
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2"
  },
  deleteText: {
    color: "#b91c1c"
  }
});
