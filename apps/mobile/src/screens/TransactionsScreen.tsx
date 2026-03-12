import { Text, View } from "react-native";
import { AppHeader, Button, Card, EmptyState, ListItem, Screen, SegmentedControl, TextField } from "../components/ui";
import { createStyles, theme } from "../theme";
import { Category, Transaction } from "../types";
import { formatDateTime, formatMoney } from "../utils/format";

type TransactionFilters = {
  direction: "all" | "debit" | "credit" | "transfer";
  categoryId: "all" | string;
  from: string;
  to: string;
  sortBy: "occurredAt" | "amount";
  sortOrder: "asc" | "desc";
};

type TransactionsScreenProps = {
  items: Transaction[];
  categories: Category[];
  filters: TransactionFilters;
  pagination: {
    page: number;
    pageSize: number;
    hasMore: boolean;
    nextPage: number | null;
  };
  refreshing: boolean;
  loadingMore: boolean;
  onRefresh: () => Promise<void>;
  onAdd: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => Promise<void>;
  onFilterChange: (patch: Partial<TransactionFilters>) => void;
  onApplyFilters: () => Promise<void>;
  onResetFilters: () => Promise<void>;
  onLoadMore: () => Promise<void>;
};

const getSignedAmount = (item: Transaction): string => {
  const base = formatMoney(item.amount, item.currency);
  if (item.direction === "credit") return `+${base}`;
  if (item.direction === "debit") return `-${base}`;
  return base;
};

export const TransactionsScreen = ({
  items,
  categories,
  filters,
  pagination,
  refreshing,
  loadingMore,
  onRefresh,
  onAdd,
  onEdit,
  onDelete,
  onFilterChange,
  onApplyFilters,
  onResetFilters,
  onLoadMore
}: TransactionsScreenProps) => {
  const categoryOptions = [{ value: "all", label: "All" }, ...categories.map((category) => ({ value: category.id, label: category.name }))];

  return (
    <Screen refreshing={refreshing} onRefresh={() => void onRefresh()}>
      <AppHeader
        title="Transactions"
        subtitle="Track inflows and outflows with precise category, party, and time context."
        rightSlot={<Button label="Add" onPress={onAdd} />}
      />

      <Card variant="muted">
        <Text style={styles.filterTitle}>Filter & Sort</Text>
        <SegmentedControl
          options={[
            { value: "all", label: "All" },
            { value: "debit", label: "Debit" },
            { value: "credit", label: "Credit" },
            { value: "transfer", label: "Transfer" }
          ]}
          selected={filters.direction}
          onSelect={(value) => onFilterChange({ direction: value })}
        />

        <SegmentedControl
          options={[
            { value: "latest", label: "Latest" },
            { value: "oldest", label: "Oldest" },
            { value: "amountHigh", label: "Amount High" },
            { value: "amountLow", label: "Amount Low" }
          ]}
          selected={
            filters.sortBy === "occurredAt"
              ? filters.sortOrder === "desc"
                ? "latest"
                : "oldest"
              : filters.sortOrder === "desc"
                ? "amountHigh"
                : "amountLow"
          }
          onSelect={(value) => {
            if (value === "latest") {
              onFilterChange({ sortBy: "occurredAt", sortOrder: "desc" });
              return;
            }
            if (value === "oldest") {
              onFilterChange({ sortBy: "occurredAt", sortOrder: "asc" });
              return;
            }
            if (value === "amountHigh") {
              onFilterChange({ sortBy: "amount", sortOrder: "desc" });
              return;
            }
            onFilterChange({ sortBy: "amount", sortOrder: "asc" });
          }}
        />

        <SegmentedControl options={categoryOptions} selected={filters.categoryId} onSelect={(value) => onFilterChange({ categoryId: value })} />

        <View style={styles.dateRow}>
          <TextField
            label="From (YYYY-MM-DD)"
            value={filters.from}
            onChangeText={(value) => onFilterChange({ from: value })}
            autoCapitalize="none"
            containerStyle={styles.flexField}
          />
          <TextField
            label="To (YYYY-MM-DD)"
            value={filters.to}
            onChangeText={(value) => onFilterChange({ to: value })}
            autoCapitalize="none"
            containerStyle={styles.flexField}
          />
        </View>

        <View style={styles.filterActions}>
          <Button label="Reset" variant="ghost" onPress={() => void onResetFilters()} style={styles.flexAction} />
          <Button label="Apply" variant="secondary" onPress={() => void onApplyFilters()} style={styles.flexAction} />
        </View>
      </Card>

      <Text style={styles.paginationMeta}>
        Page {pagination.page} · Showing {items.length} transaction{items.length === 1 ? "" : "s"}
      </Text>

      {items.length === 0 ? (
        <EmptyState title="No transactions found" description="Adjust filters or add your first transaction to start tracking trends." />
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

      {pagination.hasMore ? <Button label="Load More" variant="secondary" loading={loadingMore} onPress={() => void onLoadMore()} /> : null}
    </Screen>
  );
};

const styles = createStyles(() => ({
  filterTitle: {
    color: theme.color.textPrimary,
    fontSize: theme.typography.body,
    fontWeight: "700"
  },
  dateRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  flexField: {
    flex: 1
  },
  filterActions: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  paginationMeta: {
    color: theme.color.textMuted,
    fontSize: theme.typography.caption,
    fontWeight: "700"
  },
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
