import { Text, View } from "react-native";
import { AppHeader, Button, Card, EmptyState, ListItem, Screen } from "../components/ui";
import { createStyles, theme } from "../theme";
import { Category } from "../types";

type CategoryManagerScreenProps = {
  categories: Category[];
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  onBack: () => void;
  onAdd: () => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => Promise<void>;
};

export const CategoryManagerScreen = ({
  categories,
  refreshing,
  onRefresh,
  onBack,
  onAdd,
  onEdit,
  onDelete
}: CategoryManagerScreenProps) => {
  const defaultCategories = categories.filter((item) => item.isDefault);
  const customCategories = categories.filter((item) => !item.isDefault);

  return (
    <Screen refreshing={refreshing} onRefresh={() => void onRefresh()}>
      <AppHeader
        title="Category Studio"
        subtitle="Customize your finance taxonomy."
        rightSlot={<Button label="New Category" variant="primary" onPress={onAdd} style={{ minHeight: 40 }} />}
      />

      <Card variant="glass" style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Custom Categories</Text>
        {customCategories.length === 0 ? (
          <EmptyState title="No custom categories yet" description="Create your own debit/credit/transfer categories to personalize tracking." />
        ) : (
          <View style={styles.list}>
            {customCategories.map((item) => (
              <ListItem
                key={item.id}
                useCard
                title={item.name}
                subtitle={`${item.direction.toUpperCase()} category`}
                trailing={
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>CUSTOM</Text>
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
                    label={<Text style={{ color: theme.color.actionDanger, fontWeight: "700" }}>Delete</Text>} 
                    variant="ghost" 
                    onPress={() => void onDelete(item)} 
                    style={styles.smallActionDanger} 
                  />
                </View>
              </ListItem>
            ))}
          </View>
        )}
      </Card>

      <Card variant="muted" style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Default Categories</Text>
        <View style={styles.list}>
          {defaultCategories.map((item) => (
            <ListItem
              key={item.id}
              useCard
              title={item.name}
              subtitle={`${item.direction.toUpperCase()} category`}
              trailing={
                <View style={[styles.pill, styles.defaultPill]}>
                  <Text style={[styles.pillText, styles.defaultPillText]}>SYSTEM</Text>
                </View>
              }
            />
          ))}
        </View>
      </Card>

      <Button label="Back to Settings" variant="ghost" onPress={onBack} />
    </Screen>
  );
};

const styles = createStyles(() => ({
  sectionCard: {
    gap: theme.spacing.md
  },
  sectionTitle: {
    color: theme.color.textPrimary,
    fontSize: theme.typography.body,
    fontWeight: "800"
  },
  list: {
    gap: theme.spacing.sm
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
  pill: {
    backgroundColor: theme.color.bgElevated,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4
  },
  pillText: {
    color: theme.color.textPrimary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1
  },
  defaultPill: {
    backgroundColor: theme.color.surfaceMuted
  },
  defaultPillText: {
    color: theme.color.textMuted
  }
}));
