import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Transaction } from "../types";

type TransactionsScreenProps = {
  items: Transaction[];
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  onAdd: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => Promise<void>;
};

const formatAmount = (amount: number, direction: Transaction["direction"]) => {
  const prefix = direction === "credit" ? "+" : direction === "debit" ? "-" : "";
  return `${prefix}₹${amount.toFixed(2)}`;
};

const formatDate = (iso: string) => new Date(iso).toLocaleString();

export const TransactionsScreen = ({ items, refreshing, onRefresh, onAdd, onEdit, onDelete }: TransactionsScreenProps) => {
  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />} contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Transactions</Text>
        <Pressable style={styles.addButton} onPress={onAdd}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No transactions yet</Text>
          <Text style={styles.emptySubtitle}>Add your first transaction to start tracking expenses.</Text>
        </View>
      ) : null}

      {items.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.category}>{item.categoryName ?? "Uncategorized"}</Text>
            <Text style={[styles.amount, item.direction === "credit" ? styles.credit : styles.debit]}>{formatAmount(item.amount, item.direction)}</Text>
          </View>

          <Text style={styles.meta}>{item.counterparty ?? "No counterparty"}</Text>
          <Text style={styles.meta}>{formatDate(item.occurredAt)}</Text>
          {item.note ? <Text style={styles.note}>{item.note}</Text> : null}

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
  amount: {
    fontSize: 16,
    fontWeight: "800"
  },
  credit: {
    color: "#15803d"
  },
  debit: {
    color: "#b91c1c"
  },
  meta: {
    color: "#64748b",
    fontSize: 13
  },
  note: {
    color: "#334155",
    fontSize: 14
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
