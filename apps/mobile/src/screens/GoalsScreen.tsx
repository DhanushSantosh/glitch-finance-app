import { Text, View } from "react-native";
import { AppHeader, Button, EmptyState, ListItem, Screen } from "../components/ui";
import { createStyles, theme } from "../theme";
import { Goal } from "../types";
import { formatMoney } from "../utils/format";
import { Target, CheckCircle, Clock, Zap } from "lucide-react-native";

type GoalsScreenProps = {
  items: Goal[];
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  onAdd: () => void;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => Promise<void>;
  onContribute: (goal: Goal, increment: number) => Promise<void>;
};

const quickContributeIncrements = [500, 1000, 5000] as const;

export const GoalsScreen = ({ items, refreshing, onRefresh, onAdd, onEdit, onDelete, onContribute }: GoalsScreenProps) => {
  return (
    <Screen refreshing={refreshing} onRefresh={() => void onRefresh()}>
      <AppHeader
        title="Objectives"
        subtitle="Capital accumulation targets."
        rightSlot={<Button label="New Target" onPress={onAdd} style={{ minHeight: 40 }} />}
      />

      <View style={styles.listHeader}>
        <View style={styles.titleRow}>
          <Target size={18} color={theme.color.textMuted} />
          <Text style={styles.sectionTitle}>ACTIVE PORTFOLIO</Text>
        </View>
      </View>

      {items.length === 0 ? (
        <EmptyState title="No active objectives" description="Initialize a saving target to begin capital accumulation." />
      ) : null}

      <View style={styles.listContainer}>
        {items.map((item) => (
          <ListItem
            key={item.id}
            useCard
            title={item.name}
            subtitle={`${item.progressPercent.toFixed(0)}% SECURED`}
            meta={item.targetDate ? `DEADLINE: ${new Date(item.targetDate).toLocaleDateString()}` : "OPEN ENDED"}
            trailing={
              <View style={styles.amountContainer}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  {item.isCompleted ? <CheckCircle size={16} color={theme.color.statusSuccess} /> : <Clock size={16} color={theme.color.actionPrimary} />}
                  <Text style={[styles.amount, item.isCompleted ? styles.completed : styles.info]}>
                    {formatMoney(item.currentAmount, item.currency)}
                  </Text>
                </View>
                <Text style={styles.amountLabel}>CAPTURED</Text>
              </View>
            }
          >
            <View style={styles.progressTrack}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${Math.min(item.progressPercent, 100)}%` },
                  item.isCompleted ? styles.fillSuccess : styles.fillInfo
                ]} 
              />
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailWrap}>
                <Text style={styles.detailLabel}>TARGET</Text>
                <Text style={styles.detailText}>{formatMoney(item.targetAmount, item.currency)}</Text>
              </View>
              <View style={styles.detailWrapRight}>
                <Text style={styles.detailLabel}>DEFICIT</Text>
                <Text style={[styles.detailText, { color: theme.color.textPrimary }]}>{formatMoney(item.remainingAmount, item.currency)}</Text>
              </View>
            </View>

            {!item.isCompleted ? (
              <>
                <View style={styles.quickLabelContainer}>
                  <Zap size={12} color={theme.color.statusWarn} style={{ marginRight: 4 }} />
                  <Text style={styles.quickLabel}>QUICK INJECT</Text>
                </View>
                <View style={styles.quickRow}>
                  {quickContributeIncrements.map((increment) => (
                    <Button
                      key={`${item.id}-${increment}`}
                      label={
                        <Text style={styles.quickActionText}>
                          +{formatMoney(increment, item.currency)}
                        </Text>
                      }
                      variant="ghost"
                      onPress={() => void onContribute(item, increment)}
                      style={styles.quickAction}
                    />
                  ))}
                </View>
              </>
            ) : null}

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
        ))}
      </View>
    </Screen>
  );
};

const styles = createStyles(() => ({
  listHeader: {
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
    marginTop: -2,
    letterSpacing: 1
  },
  info: {
    color: theme.color.actionPrimary
  },
  completed: {
    color: theme.color.statusSuccess
  },
  progressTrack: {
    height: 8,
    backgroundColor: theme.color.borderSubtle,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: theme.spacing.xs
  },
  progressFill: {
    height: "100%",
    borderRadius: 4
  },
  fillInfo: { backgroundColor: theme.color.actionPrimary },
  fillSuccess: { backgroundColor: theme.color.statusSuccess },
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
  quickLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs
  },
  quickLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.color.textSecondary,
    letterSpacing: 1
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  quickAction: {
    flex: 1,
    minWidth: '30%',
    minHeight: 36,
    paddingVertical: 0,
    paddingHorizontal: theme.spacing.xs,
    backgroundColor: theme.color.surfaceMuted,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.borderSubtle
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.color.textPrimary,
    letterSpacing: 0.5
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
  }
}));
