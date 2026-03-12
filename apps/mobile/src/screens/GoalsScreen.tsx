import { Text, View } from "react-native";
import { AppHeader, Button, EmptyState, ListItem, Screen } from "../components/ui";
import { createStyles, theme } from "../theme";
import { Goal } from "../types";
import { formatMoney } from "../utils/format";

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
        title="Goals"
        subtitle="Define savings targets and monitor progress with clear milestones."
        rightSlot={<Button label="Add" onPress={onAdd} />}
      />

      {items.length === 0 ? (
        <EmptyState title="No goals yet" description="Create a savings goal and track your progress over time." />
      ) : null}

      {items.map((item) => (
        <ListItem
          key={item.id}
          title={item.name}
          subtitle={`Progress ${item.progressPercent.toFixed(2)}%`}
          detail={`Target ${formatMoney(item.targetAmount, item.currency)} | Current ${formatMoney(item.currentAmount, item.currency)} | Remaining ${formatMoney(item.remainingAmount, item.currency)}`}
          meta={item.targetDate ? `Target date ${new Date(item.targetDate).toLocaleDateString()}` : "No target date"}
          trailing={<Text style={[styles.progress, item.isCompleted ? styles.completed : null]}>{item.progressPercent.toFixed(2)}%</Text>}
        >
          <View style={styles.quickRow}>
            {quickContributeIncrements.map((increment) => (
              <Button
                key={`${item.id}-${increment}`}
                label={`+${formatMoney(increment, item.currency)}`}
                variant="ghost"
                onPress={() => void onContribute(item, increment)}
                style={styles.quickAction}
              />
            ))}
          </View>

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
  progress: {
    fontSize: theme.typography.bodySmall,
    fontWeight: "800",
    color: theme.color.statusInfo
  },
  completed: {
    color: theme.color.statusSuccess
  },
  quickRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  quickAction: {
    flex: 1,
    minHeight: 44
  },
  actionRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  flexAction: {
    flex: 1
  }
}));
