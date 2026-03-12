import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Goal } from "../types";

type GoalsScreenProps = {
  items: Goal[];
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  onAdd: () => void;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => Promise<void>;
};

const formatMoney = (value: number, currency: string): string => {
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  return `${symbol}${value.toFixed(2)}`;
};

export const GoalsScreen = ({ items, refreshing, onRefresh, onAdd, onEdit, onDelete }: GoalsScreenProps) => {
  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />} contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Goals</Text>
        <Pressable style={styles.addButton} onPress={onAdd}>
          <Text style={styles.addButtonText}>Add Goal</Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No goals yet</Text>
          <Text style={styles.emptySubtitle}>Create a savings goal and track progress over time.</Text>
        </View>
      ) : null}

      {items.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.goalName}>{item.name}</Text>
            <Text style={[styles.progress, item.isCompleted && styles.completed]}>{item.progressPercent.toFixed(2)}%</Text>
          </View>

          <Text style={styles.meta}>Target: {formatMoney(item.targetAmount, item.currency)}</Text>
          <Text style={styles.meta}>Current: {formatMoney(item.currentAmount, item.currency)}</Text>
          <Text style={styles.meta}>Remaining: {formatMoney(item.remainingAmount, item.currency)}</Text>
          {item.targetDate ? <Text style={styles.meta}>Target date: {new Date(item.targetDate).toLocaleDateString()}</Text> : null}

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
  goalName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a"
  },
  progress: {
    color: "#1e40af",
    fontWeight: "700"
  },
  completed: {
    color: "#15803d"
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
