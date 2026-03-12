import { Pressable, StyleSheet, Text, View } from "react-native";

type SettingsScreenProps = {
  smsDisclosureVersion: string;
  onRequestEnable: (enabled: boolean) => Promise<void>;
  onSignOut: () => Promise<void>;
};

export const SettingsScreen = ({ smsDisclosureVersion, onRequestEnable, onSignOut }: SettingsScreenProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>SMS Detection</Text>
        <Text style={styles.text}>Disabled by default. This feature is privacy-guarded and currently not enabled in Sprint 1.1.</Text>
        <Text style={styles.meta}>Disclosure version: {smsDisclosureVersion}</Text>

        <View style={styles.row}>
          <Pressable style={styles.secondaryButton} onPress={() => void onRequestEnable(false)}>
            <Text style={styles.secondaryText}>Keep Disabled</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={() => void onRequestEnable(true)}>
            <Text style={styles.primaryText}>Request Enable</Text>
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.signOutButton} onPress={() => void onSignOut()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12
  },
  title: {
    fontSize: 24,
    color: "#0f172a",
    fontWeight: "800"
  },
  card: {
    borderWidth: 1,
    borderColor: "#dbe5f5",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    gap: 8
  },
  cardTitle: {
    fontSize: 18,
    color: "#111827",
    fontWeight: "700"
  },
  text: {
    color: "#475569",
    lineHeight: 20
  },
  meta: {
    color: "#64748b",
    fontSize: 13
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff"
  },
  secondaryText: {
    color: "#334155",
    fontWeight: "700"
  },
  primaryButton: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#2563eb"
  },
  primaryText: {
    color: "#fff",
    fontWeight: "700"
  },
  signOutButton: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: "#fee2e2",
    borderColor: "#fecaca",
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: "center"
  },
  signOutText: {
    color: "#b91c1c",
    fontWeight: "700"
  }
});
