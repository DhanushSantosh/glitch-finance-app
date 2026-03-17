import { Text, View } from "react-native";
import { AppHeader, Button, Card, EmptyState, InlineMessage, ListItem, Screen, StatTile, TextField } from "../components/ui";
import { createStyles, theme } from "../theme";
import { Budget } from "../types";
import { formatMoney } from "../utils/format";
import { RegionalPreferences } from "../utils/regional";
import { ChevronLeft, ChevronRight, RefreshCw, PieChart } from "lucide-react-native";

type BudgetsScreenProps = {
  month: string;
  items: Budget[];
  regionalPreferences: RegionalPreferences;
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
  regionalPreferences,
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
        title="Allocations"
        subtitle="Manage limits and track utilization."
        rightSlot={<Button label="New Plan" onPress={onAdd} style={{ minHeight: 40 }} />}
      />

      <Card variant="glass" style={styles.monthCard}>
        <View style={styles.monthNavRow}>
          <Button 
            label={<ChevronLeft size={20} color={theme.color.textPrimary} />} 
            variant="ghost" 
            onPress={() => void onPreviousMonth()} 
            style={styles.navButton} 
          />
          <TextField 
            label="CYCLE (YYYY-MM)" 
            value={month} 
            onChangeText={onMonthChange} 
            autoCapitalize="none" 
            containerStyle={styles.monthField} 
            style={styles.compactInput}
          />
          <Button 
            label={<ChevronRight size={20} color={theme.color.textPrimary} />} 
            variant="ghost" 
            onPress={() => void onNextMonth()} 
            style={styles.navButton} 
          />
        </View>
        <Button 
          label={
            <>
              <RefreshCw size={16} color={theme.color.textPrimary} />
              <Text style={{color: theme.color.textPrimary, fontWeight: '700'}}>SYNC DATA</Text>
            </>
          } 
          variant="secondary" 
          onPress={() => void onApplyMonth()} 
          style={styles.syncButton} 
        />
      </Card>

      {overLimitCount > 0 ? (
        <InlineMessage tone="error" text={`${overLimitCount} category limits breached this cycle.`} />
      ) : null}

      {overLimitCount === 0 && nearLimitCount > 0 ? (
        <InlineMessage tone="warn" text={`${nearLimitCount} categories approaching limits.`} />
      ) : null}

      <View style={styles.statGrid}>
        <StatTile label="PLANNED" value={formatMoney(totals.budgeted, regionalPreferences.currency, regionalPreferences)} tone="info" />
        <StatTile label="CONSUMED" value={formatMoney(totals.spent, regionalPreferences.currency, regionalPreferences)} tone="negative" />
      </View>

      <View style={styles.listHeader}>
        <View style={styles.titleRow}>
          <PieChart size={18} color={theme.color.textMuted} />
          <Text style={styles.sectionTitle}>ALLOCATION MATRIX</Text>
        </View>
      </View>

      {items.length === 0 ? (
        <EmptyState title="No active limits" description="Initialize a budget to start enforcing limits." />
      ) : null}

      <View style={styles.listContainer}>
        {items.map((item) => {
          const isOver = item.utilizationPercent > 100;
          const isNear = item.utilizationPercent >= 85;

          return (
            <ListItem
              key={item.id}
              useCard
              title={item.categoryName}
              subtitle={`${item.utilizationPercent.toFixed(0)}% Utilized`}
              trailing={
                <View style={styles.amountContainer}>
                  <Text style={[styles.amount, isOver ? styles.negative : isNear ? styles.warn : styles.positive]}>
                    {formatMoney(item.remainingAmount, item.currency, regionalPreferences)}
                  </Text>
                  <Text style={styles.amountLabel}>REMAINING</Text>
                </View>
              }
            >
              <View style={styles.progressTrack}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${Math.min(item.utilizationPercent, 100)}%` },
                    isOver ? styles.fillError : isNear ? styles.fillWarn : styles.fillSuccess
                  ]} 
                />
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailWrap}>
                  <Text style={styles.detailLabel}>CAP</Text>
                  <Text style={styles.detailText}>{formatMoney(item.amount, item.currency, regionalPreferences)}</Text>
                </View>
                <View style={styles.detailWrapRight}>
                  <Text style={styles.detailLabel}>USED</Text>
                  <Text style={[styles.detailText, { color: theme.color.textPrimary }]}>{formatMoney(item.spentAmount, item.currency, regionalPreferences)}</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <Button 
                  label="Modify" 
                  variant="ghost" 
                  onPress={() => onEdit(item)} 
                  style={styles.smallAction} 
                />
                <Button 
                  label={<Text style={{ color: theme.color.actionDanger, fontWeight: "700" }}>Clear</Text>} 
                  variant="ghost" 
                  onPress={() => void onDelete(item)} 
                  style={styles.smallActionDanger} 
                />
              </View>
            </ListItem>
          );
        })}
      </View>
    </Screen>
  );
};

const styles = createStyles(() => ({
  monthCard: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    backgroundColor: theme.color.bgElevated
  },
  monthNavRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    alignItems: "flex-end"
  },
  monthField: {
    flex: 1,
    marginBottom: 0
  },
  compactInput: {
    minHeight: 44,
    textAlign: "center",
    letterSpacing: 2
  },
  navButton: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 0
  },
  syncButton: {
    minHeight: 44,
    flexDirection: "row"
  },
  statGrid: {
    flexDirection: "row",
    gap: theme.spacing.md
  },
  listHeader: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  sectionTitle: {
    color: theme.color.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2
  },
  listContainer: {
    gap: theme.spacing.md
  },
  amountContainer: {
    alignItems: "flex-end"
  },
  amount: {
    fontSize: theme.typography.heading,
    fontWeight: "900",
    letterSpacing: -0.5
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.color.textMuted,
    marginTop: -4,
    letterSpacing: 1
  },
  progressTrack: {
    height: 6,
    backgroundColor: theme.color.borderSubtle, // Darker track for high contrast
    borderRadius: 3,
    overflow: "hidden",
    marginTop: theme.spacing.xs
  },
  progressFill: {
    height: "100%",
    borderRadius: 3
  },
  fillSuccess: { backgroundColor: theme.color.statusSuccess },
  fillWarn: { backgroundColor: theme.color.statusWarn },
  fillError: { backgroundColor: theme.color.statusError },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacing.sm
  },
  detailWrap: {
    gap: 2
  },
  detailWrapRight: {
    gap: 2,
    alignItems: "flex-end"
  },
  detailLabel: {
    fontSize: 9,
    color: theme.color.textMuted,
    fontWeight: "800",
    letterSpacing: 1
  },
  detailText: {
    color: theme.color.textSecondary,
    fontSize: theme.typography.caption,
    fontWeight: "700"
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
    minHeight: 40,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: theme.color.borderSubtle
  },
  smallActionDanger: {
    flex: 1,
    minHeight: 40,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: theme.color.actionDanger,
    backgroundColor: "transparent"
  },
  positive: { color: theme.color.statusSuccess },
  negative: { color: theme.color.statusError },
  warn: { color: theme.color.statusWarn }
}));
