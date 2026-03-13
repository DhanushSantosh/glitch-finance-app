import { Text, View } from "react-native";
import { AppHeader, Button, Card, InlineMessage, Screen } from "../components/ui";
import { createStyles, theme } from "../theme";
import { ShieldAlert, ShieldCheck, LogOut, TerminalSquare, FolderTree } from "lucide-react-native";

type SettingsScreenProps = {
  smsDisclosureVersion: string;
  onRequestEnable: (enabled: boolean) => Promise<void>;
  onOpenCategoryManager: () => void;
  onDeleteAccount: () => Promise<void>;
  onSignOut: () => Promise<void>;
};

export const SettingsScreen = ({
  smsDisclosureVersion,
  onRequestEnable,
  onOpenCategoryManager,
  onDeleteAccount,
  onSignOut
}: SettingsScreenProps) => {
  return (
    <Screen>
      <AppHeader title="System" subtitle="Security and configuration." />

      <Card variant="glass" style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.titleRow}>
            <TerminalSquare size={18} color={theme.color.textMuted} />
            <Text style={styles.sectionTitle}>DATA EXTRACTION</Text>
          </View>
          <Text style={styles.sectionSubtitle}>SMS Parsing Protocol</Text>
        </View>
        
        <InlineMessage 
          tone="warn" 
          text="Extraction protocol offline. Intent logging only for current build." 
        />
        
        <View style={styles.disclosureInfo}>
          <Text style={styles.disclosureText}>POLICY VER: {smsDisclosureVersion.toUpperCase()}</Text>
        </View>

        <View style={styles.actionRow}>
          <Button 
            label={
              <>
                <ShieldCheck size={16} color={theme.color.textPrimary} />
                <Text style={{color: theme.color.textPrimary, fontWeight: '700'}}>MAINTAIN OFFLINE</Text>
              </>
            } 
            variant="ghost" 
            onPress={() => void onRequestEnable(false)} 
            style={styles.flexAction} 
          />
          <Button 
            label={
              <>
                <ShieldAlert size={16} color={theme.color.textInverse} />
                <Text style={{color: theme.color.textInverse, fontWeight: '800'}}>AUTHORIZE</Text>
              </>
            } 
            variant="primary" 
            onPress={() => void onRequestEnable(true)} 
            style={styles.flexAction} 
          />
        </View>
      </Card>

      <Card variant="glass" style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.titleRow}>
            <FolderTree size={18} color={theme.color.textMuted} />
            <Text style={styles.sectionTitle}>CATEGORY STUDIO</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Create and maintain your custom categories.</Text>
        </View>
        <Button label="MANAGE CATEGORIES" variant="secondary" onPress={onOpenCategoryManager} />
      </Card>

      <Card variant="muted" style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.titleRow}>
            <LogOut size={18} color={theme.color.statusError} />
            <Text style={[styles.sectionTitle, { color: theme.color.statusError }]}>SESSION TERMINATION</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Revoke local access tokens</Text>
        </View>
        <Button 
          label="SEVER CONNECTION" 
          variant="danger" 
          onPress={() => void onSignOut()} 
          style={styles.signOutButton}
        />
      </Card>

      <Card variant="muted" style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.color.statusError }]}>ACCOUNT DELETION</Text>
          <Text style={styles.sectionSubtitle}>Permanently remove account data from cloud storage.</Text>
        </View>
        <Button label="DELETE ACCOUNT" variant="danger" onPress={() => void onDeleteAccount()} />
      </Card>

      <View style={styles.versionFooter}>
        <Text style={styles.versionText}>GLITCH CORE V1.0.0 // BUILD 2026.1</Text>
      </View>
    </Screen>
  );
};

const styles = createStyles(() => ({
  sectionCard: {
    padding: theme.spacing.xl,
    gap: theme.spacing.lg
  },
  sectionHeader: {
    gap: 4
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  sectionTitle: {
    color: theme.color.textPrimary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2
  },
  sectionSubtitle: {
    color: theme.color.textSecondary,
    fontSize: theme.typography.body,
    fontWeight: "600",
    letterSpacing: -0.5
  },
  disclosureInfo: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.color.bgBase,
    borderWidth: 1,
    borderColor: theme.color.borderSubtle,
    borderRadius: theme.radius.sm,
    alignItems: "center"
  },
  disclosureText: {
    color: theme.color.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1
  },
  actionRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs
  },
  flexAction: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row"
  },
  signOutButton: {
    marginTop: theme.spacing.sm,
    minHeight: 52
  },
  versionFooter: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
    opacity: 0.5
  },
  versionText: {
    color: theme.color.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2
  }
}));
