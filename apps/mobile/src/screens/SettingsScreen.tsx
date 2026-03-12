import { View } from "react-native";
import { AppHeader, Button, Card, InlineMessage, Screen } from "../components/ui";
import { createStyles, theme } from "../theme";

type SettingsScreenProps = {
  smsDisclosureVersion: string;
  onRequestEnable: (enabled: boolean) => Promise<void>;
  onSignOut: () => Promise<void>;
};

export const SettingsScreen = ({ smsDisclosureVersion, onRequestEnable, onSignOut }: SettingsScreenProps) => {
  return (
    <Screen>
      <AppHeader title="Settings" subtitle="Manage privacy controls and account access in one place." />

      <Card>
        <AppHeader title="SMS Detection" subtitle="Disabled by default. Sprint 1 keeps this feature blocked while collecting intent only." />
        <InlineMessage tone="warn" text="Guardrail: no SMS read path exists in this release." />
        <InlineMessage tone="info" text={`Disclosure version: ${smsDisclosureVersion}`} />

        <View style={styles.actionRow}>
          <Button label="Keep Disabled" variant="secondary" onPress={() => void onRequestEnable(false)} style={styles.flexAction} />
          <Button label="Request Enable" onPress={() => void onRequestEnable(true)} style={styles.flexAction} />
        </View>
      </Card>

      <Card>
        <AppHeader title="Account" subtitle="Sign out from this device safely." />
        <Button label="Sign Out" variant="danger" onPress={() => void onSignOut()} />
      </Card>
    </Screen>
  );
};

const styles = createStyles(() => ({
  actionRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  flexAction: {
    flex: 1
  }
}));
