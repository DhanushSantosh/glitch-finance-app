import { Text, View } from "react-native";
import { AppHeader, Button, Card, EmptyState, ListItem, Screen, SegmentedControl, TextField } from "../components/ui";
import { createStyles, theme } from "../theme";
import { Category, Transaction } from "../types";
import { formatDateTime, formatMoney } from "../utils/format";
import { ArrowUpRight, ArrowDownRight, RefreshCw, Filter } from "lucide-react-native";

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
        title="Ledger"
        subtitle="Complete transaction history."
        rightSlot={<Button label="Log Entry" variant="primary" onPress={onAdd} style={{ minHeight: 40 }} />}
      />

      <Card variant="glass" style={styles.filterCard}>
        <View style={styles.filterHeader}>
          <Filter size={18} color={theme.color.textPrimary} />
          <Text style={styles.filterTitle}>Parameters</Text>
        </View>
        
        <SegmentedControl
          label="DIRECTION"
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
          label="SORT METRIC"
          options={[
            { value: "latest", label: "Recent" },
            { value: "amountHigh", label: "Largest" },
            { value: "amountLow", label: "Smallest" }
          ]}
          selected={
            filters.sortBy === "occurredAt"
              ? "latest"
              : filters.sortOrder === "desc"
                ? "amountHigh"
                : "amountLow"
          }
          onSelect={(value) => {
            if (value === "latest") {
              onFilterChange({ sortBy: "occurredAt", sortOrder: "desc" });
              return;
            }
            if (value === "amountHigh") {
              onFilterChange({ sortBy: "amount", sortOrder: "desc" });
              return;
            }
            onFilterChange({ sortBy: "amount", sortOrder: "asc" });
          }}
        />

        <View style={styles.dateRow}>
          <TextField
            label="FROM (YYYY-MM-DD)"
            placeholder="e.g. 2026-01-01"
            value={filters.from}
            onChangeText={(value) => onFilterChange({ from: value })}
            containerStyle={styles.flexField}
          />
          <TextField
            label="TO (YYYY-MM-DD)"
            placeholder="e.g. 2026-12-31"
            value={filters.to}
            onChangeText={(value) => onFilterChange({ to: value })}
            containerStyle={styles.flexField}
          />
        </View>

        <View style={styles.filterActions}>
          <Button label="Reset" variant="ghost" onPress={() => void onResetFilters()} style={styles.flexAction} />
          <Button label="Apply Filter" variant="secondary" onPress={() => void onApplyFilters()} style={styles.flexAction} />
        </View>
      </Card>

      <View style={styles.listHeader}>
        <Text style={styles.paginationMeta}>
          {items.length} {items.length === 1 ? "RECORD" : "RECORDS"} MATCHED
        </Text>
      </View>

      {items.length === 0 ? (
        <EmptyState title="Empty Ledger" description="No transactions match the current parameters." />
      ) : null}

      <View style={styles.listContainer}>
        {items.map((item) => {
          const isDebit = item.direction === "debit";
          const isCredit = item.direction === "credit";
          
          return (
            <ListItem
              key={item.id}
              useCard
              title={item.categoryName ?? "Uncategorized"}
              subtitle={item.counterparty ?? "System"}
              meta={formatDateTime(item.occurredAt)}
              detail={item.note ?? undefined}
              trailing={
                <View style={styles.amountContainer}>
                  <View style={styles.amountValueRow}>
                    {isDebit ? <ArrowDownRight size={18} color={theme.color.statusError} style={{marginRight: 4}}/> : null}
                    {isCredit ? <ArrowUpRight size={18} color={theme.color.statusSuccess} style={{marginRight: 4}}/> : null}
                    {!isDebit && !isCredit ? <RefreshCw size={16} color={theme.color.statusInfo} style={{marginRight: 4}}/> : null}
                    <Text style={[styles.amount, isCredit ? styles.credit : null, isDebit ? styles.debit : null]}>
                      {formatMoney(item.amount, item.currency)}
                    </Text>
                  </View>
                </View>
              }
            >
              <View style={styles.actionRow}>
                <Button 
                  label="Edit" 
                  variant="ghost" 
                  onPress={() => onEdit(item)} 
                  style={styles.smallAction} 
                />
                <Button 
                  label="Remove" 
                  variant="ghost" 
                  onPress={() => void onDelete(item)} 
                  style={[styles.smallAction, { backgroundColor: "rgba(255, 51, 102, 0.1)" }]} 
                />
              </View>
            </ListItem>
          );
        })}
      </View>

      {pagination.hasMore ? (
        <View style={styles.loadMoreContainer}>
          <Button label="Load Older Records" variant="secondary" loading={loadingMore} onPress={() => void onLoadMore()} />
        </View>
      ) : null}
    </Screen>
  );
};

const styles = createStyles(() => ({
  filterCard: {
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.color.bgElevated
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.borderSubtle,
    paddingBottom: theme.spacing.sm
  },
  filterTitle: {
    color: theme.color.textPrimary,
    fontSize: theme.typography.body,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1
  },
  dateRow: {
    flexDirection: "row",
    gap: theme.spacing.md
  },
  flexField: {
    flex: 1
  },
  filterActions: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: theme.spacing.md
  },
  paginationMeta: {
    color: theme.color.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2
  },
  listContainer: {
    gap: theme.spacing.md
  },
  amountContainer: {
    alignItems: "flex-end"
  },
  amountValueRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  amount: {
    fontSize: theme.typography.heading,
    fontWeight: "800",
    color: theme.color.textPrimary,
    letterSpacing: -0.5
  },
  credit: {
    color: theme.color.statusSuccess
  },
  debit: {
    color: theme.color.textPrimary // In high contrast dark mode, debit is often white, differentiated by icon
  },
  actionRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.color.borderSubtle,
    paddingTop: theme.spacing.sm
  },
  smallAction: {
    flex: 1,
    minHeight: 36,
    paddingVertical: 0
  },
  flexAction: {
    flex: 1
  },
  loadMoreContainer: {
    paddingVertical: theme.spacing.xl
  }
}));
