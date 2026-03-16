import { useState, useMemo } from "react";
import { View, Text, Modal, FlatList, Pressable, SafeAreaView, TextInput } from "react-native";
import { createStyles, theme } from "../../theme";
import { ChevronDown, Check, X, Search } from "lucide-react-native";
import { TextField } from "./TextField";

type Option = {
  value: string;
  label: string;
};

type SelectFieldProps = {
  label: string;
  value: string;
  options: Option[];
  onSelect: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
};

export const SelectField = ({ label, value, options, onSelect, placeholder, searchable = false }: SelectFieldProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : value;

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase().trim();
    return options.filter((opt) => 
      opt.label.toLowerCase().includes(query) || opt.value.toLowerCase().includes(query)
    );
  }, [options, searchable, searchQuery]);

  return (
    <>
      <Pressable onPress={() => { setSearchQuery(""); setModalVisible(true); }}>
        <View pointerEvents="none">
          <TextField
            label={label}
            value={displayValue}
            onChangeText={() => {}}
            placeholder={placeholder}
            editable={false}
          />
        </View>
        <View style={styles.chevronWrap}>
          <ChevronDown size={20} color={theme.color.textMuted} />
        </View>
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {label}</Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <X size={24} color={theme.color.textPrimary} />
              </Pressable>
            </View>
            
            {searchable && (
              <View style={styles.searchContainer}>
                <Search size={18} color={theme.color.textMuted} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={`Search ${label}...`}
                  placeholderTextColor={theme.color.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}

            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={20}
              maxToRenderPerBatch={20}
              windowSize={5}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.optionRow}
                  onPress={() => {
                    onSelect(item.value);
                    setModalVisible(false);
                  }}
                >
                  <Text style={[styles.optionText, item.value === value && styles.optionTextSelected]}>
                    {item.label}
                  </Text>
                  {item.value === value && <Check size={20} color={theme.color.actionPrimary} />}
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No results found.</Text>
                </View>
              )}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
};

const styles = createStyles(() => ({
  chevronWrap: {
    position: "absolute",
    right: theme.spacing.md,
    top: 36, // Approximate vertical center of the input area
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.color.bgBase,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    maxHeight: "85%",
    minHeight: "50%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.borderSubtle,
  },
  modalTitle: {
    color: theme.color.textPrimary,
    fontSize: theme.typography.heading,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.color.surfaceMuted,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.color.borderSubtle,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: theme.color.textPrimary,
    fontSize: theme.typography.body,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.lg,
  },
  optionText: {
    color: theme.color.textPrimary,
    fontSize: theme.typography.body,
  },
  optionTextSelected: {
    color: theme.color.actionPrimary,
    fontWeight: "700",
  },
  separator: {
    height: 1,
    backgroundColor: theme.color.borderSubtle,
    marginLeft: theme.spacing.lg,
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    color: theme.color.textMuted,
    fontSize: theme.typography.body,
  }
}));
