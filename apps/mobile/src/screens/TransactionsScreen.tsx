import { Text, View } from "react-native";
import { AppHeader, Button, EmptyState, ListItem, Screen } from "../components/ui";
import { createStyles, theme } from "../theme";
import { Transaction } from "../types";
import { formatDateTime, formatMoney } from "../utils/format";

type TransactionsScreenProps = {
  items: Transaction[];
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  onAdd: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => Promise<void>;
};

const getSignedAmount = (item: Transaction): string => {
  const base = formatMoney(item.amount, item.currency);
  if (item.direction === "credit") return `+${base}`;
  if (item.direction === "debit") return `-${base}`;
  return base;
};

export const TransactionsScreen = ({ items, refreshing, onRefresh, onAdd, onEdit, onDelete }: TransactionsScreenProps) => {
  return (
    <Screen refreshing={refreshing} onRefresh={() => void onRefresh()}>
      <AppHeader
        title="Transactions"
        subtitle="Track inflows and outflows with precise category, party, and time context."
        rightSlot={<Button label="Add" onPress={onAdd} />}
      />

      {items.length === 0 ? (
        <EmptyState title="No transactions yet" description="Add your first transaction to start tracking spend and income trends." />
      ) : null}

      {items.map((item) => (
        <ListItem
          key={item.id}
          title={item.categoryName ?? "Uncategorized"}
          subtitle={item.counterparty ?? "No counterparty"}
          meta={formatDateTime(item.occurredAt)}
          detail={item.note ?? undefined}
          trailing={
            <Text style={[styles.amount, item.direction === "credit" ? styles.credit : null, item.direction === "debit" ? styles.debit : null]}>
              {getSignedAmount(item)}
            </Text>
          }
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
  amount: {
    fontSize: theme.typography.body,
    fontWeight: "800",
    color: theme.color.textPrimary
  },
  credit: {
    color: theme.color.statusSuccess
  },
  debit: {
    color: theme.color.statusError
  },
  actionRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  flexAction: {
    flex: 1
  }
}));
