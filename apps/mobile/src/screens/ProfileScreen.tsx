import { useMemo, useState } from "react";
import { Image, Switch, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { AppHeader, Button, Card, InlineMessage, Screen, TextField } from "../components/ui";
import { createStyles, theme } from "../theme";
import { UserProfile } from "../types";

type AvatarUploadPayload = {
  uri: string;
  fileName: string;
  mimeType: string;
};

type ProfileFormSubmit = {
  firstName: string;
  lastName: string;
  displayName: string;
  phoneNumber: string;
  dateOfBirth: string | null;
  avatarUrl: string;
  city: string;
  country: string;
  timezone: string;
  locale: string;
  currency: string;
  occupation: string;
  bio: string;
  settings: UserProfile["settings"];
};

type ProfileScreenProps = {
  profile: UserProfile;
  onBack: () => void;
  onSave: (payload: ProfileFormSubmit) => Promise<void>;
  onUploadAvatar: (payload: AvatarUploadPayload) => Promise<string>;
  onRemoveAvatar: () => Promise<void>;
};

const dateOnlyPattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const isValidDateOnly = (value: string): boolean => {
  if (!dateOnlyPattern.test(value)) {
    return false;
  }

  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
};

const toInitials = (displayName: string, email: string): string => {
  const fromDisplayName = displayName.trim();

  if (fromDisplayName) {
    const words = fromDisplayName.split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }

    return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
  }

  const fromEmail = email.split("@")[0] ?? "U";
  return fromEmail.slice(0, 2).toUpperCase();
};

const prepareAvatarForUpload = async (uri: string): Promise<AvatarUploadPayload> => {
  const optimized = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    {
      compress: 0.82,
      format: ImageManipulator.SaveFormat.JPEG
    }
  );

  return {
    uri: optimized.uri,
    fileName: `avatar-${Date.now()}.jpg`,
    mimeType: "image/jpeg"
  };
};

export const ProfileScreen = ({ profile, onBack, onSave, onUploadAvatar, onRemoveAvatar }: ProfileScreenProps) => {
  const [firstName, setFirstName] = useState(profile.firstName ?? "");
  const [lastName, setLastName] = useState(profile.lastName ?? "");
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [country, setCountry] = useState(profile.country ?? "");
  const [timezone, setTimezone] = useState(profile.timezone);
  const [locale, setLocale] = useState(profile.locale);
  const [currency, setCurrency] = useState(profile.currency);
  const [occupation, setOccupation] = useState(profile.occupation ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");

  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(profile.settings.pushNotificationsEnabled);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(profile.settings.emailNotificationsEnabled);
  const [weeklySummaryEnabled, setWeeklySummaryEnabled] = useState(profile.settings.weeklySummaryEnabled);
  const [biometricsEnabled, setBiometricsEnabled] = useState(profile.settings.biometricsEnabled);
  const [marketingOptIn, setMarketingOptIn] = useState(profile.settings.marketingOptIn);

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const avatarPreview = useMemo(() => {
    const normalized = avatarUrl.trim();
    if (normalized.length === 0) {
      return null;
    }

    if (!/^https?:\/\//i.test(normalized)) {
      return null;
    }

    return normalized;
  }, [avatarUrl]);

  const uploadAvatarFromUri = async (uri: string): Promise<void> => {
    setError(null);
    setSuccess(null);
    setUploadingAvatar(true);

    try {
      const preparedFile = await prepareAvatarForUpload(uri);
      const uploadedUrl = await onUploadAvatar(preparedFile);
      setAvatarUrl(uploadedUrl);
      setSuccess("Profile picture updated.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload profile picture right now.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChooseFromGallery = async () => {
    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Gallery permission is required to choose a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
      aspect: [1, 1]
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    await uploadAvatarFromUri(result.assets[0].uri);
  };

  const handleChooseFromFiles = async () => {
    setError(null);

    const result = await DocumentPicker.getDocumentAsync({
      type: "image/*",
      copyToCacheDirectory: true,
      multiple: false
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    await uploadAvatarFromUri(result.assets[0].uri);
  };

  const handleRemoveAvatar = async () => {
    setError(null);
    setSuccess(null);
    setRemovingAvatar(true);

    try {
      await onRemoveAvatar();
      setAvatarUrl("");
      setSuccess("Profile picture removed.");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove profile picture right now.");
    } finally {
      setRemovingAvatar(false);
    }
  };

  const handleSave = async () => {
    const normalizedCurrency = currency.trim().toUpperCase();

    if (normalizedCurrency.length !== 3) {
      setError("Currency must be a valid 3-letter code (for example INR).");
      return;
    }

    if (timezone.trim().length === 0) {
      setError("Timezone is required.");
      return;
    }

    if (locale.trim().length === 0) {
      setError("Locale is required.");
      return;
    }

    if (dateOfBirth.trim().length > 0 && !isValidDateOnly(dateOfBirth.trim())) {
      setError("Date of birth must be in YYYY-MM-DD format.");
      return;
    }

    if (avatarUrl.trim().length > 0 && !/^https?:\/\//i.test(avatarUrl.trim())) {
      setError("Profile picture URL must start with http:// or https://.");
      return;
    }

    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      await onSave({
        firstName,
        lastName,
        displayName,
        phoneNumber,
        dateOfBirth: dateOfBirth.trim().length > 0 ? dateOfBirth.trim() : null,
        avatarUrl,
        city,
        country,
        timezone,
        locale,
        currency: normalizedCurrency,
        occupation,
        bio,
        settings: {
          pushNotificationsEnabled,
          emailNotificationsEnabled,
          weeklySummaryEnabled,
          biometricsEnabled,
          marketingOptIn
        }
      });

      setSuccess("Profile updated successfully.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save profile right now.");
    } finally {
      setSaving(false);
    }
  };

  const avatarActionBusy = uploadingAvatar || removingAvatar || saving;

  return (
    <Screen keyboardAware>
      <AppHeader title="Your Profile" subtitle="Identity and personalized app settings." />

      {error ? <InlineMessage tone="error" text={error} /> : null}
      {success ? <InlineMessage tone="success" text={success} /> : null}

      <Card variant="glass" style={styles.profileCard}>
        <View style={styles.profileHeaderRow}>
          <View style={styles.avatarWrap}>
            {avatarPreview ? (
              <Image source={{ uri: avatarPreview }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <Text style={styles.avatarFallbackText}>{toInitials(displayName, profile.email)}</Text>
            )}
          </View>

          <View style={styles.profileMeta}>
            <Text style={styles.profileName}>{displayName.trim().length > 0 ? displayName.trim() : profile.email}</Text>
            <Text style={styles.profileEmail}>{profile.email}</Text>
          </View>
        </View>

        <View style={styles.avatarActionRow}>
          <Button
            label="Choose from Gallery"
            variant="secondary"
            disabled={avatarActionBusy}
            loading={uploadingAvatar}
            onPress={() => void handleChooseFromGallery()}
            style={styles.avatarActionButton}
          />
          <Button
            label="Choose from Files"
            variant="ghost"
            disabled={avatarActionBusy}
            onPress={() => void handleChooseFromFiles()}
            style={styles.avatarActionButton}
          />
        </View>

        <Button
          label="Remove Picture"
          variant="danger"
          disabled={avatarActionBusy || avatarUrl.trim().length === 0}
          loading={removingAvatar}
          onPress={() => void handleRemoveAvatar()}
        />
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>PERSONAL DETAILS</Text>

        <View style={styles.rowFields}>
          <TextField label="First Name" value={firstName} onChangeText={setFirstName} containerStyle={styles.halfField} />
          <TextField label="Last Name" value={lastName} onChangeText={setLastName} containerStyle={styles.halfField} />
        </View>

        <TextField label="Display Name" value={displayName} onChangeText={setDisplayName} placeholder="How your name appears in app" />
        <TextField
          label="Phone Number"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          placeholder="+91..."
        />
        <TextField
          label="Date of Birth"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          autoCapitalize="none"
          placeholder="YYYY-MM-DD"
        />
        <TextField label="Occupation" value={occupation} onChangeText={setOccupation} placeholder="Student, Engineer, Designer..." />
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>REGIONAL PREFERENCES</Text>

        <View style={styles.rowFields}>
          <TextField label="City" value={city} onChangeText={setCity} containerStyle={styles.halfField} />
          <TextField label="Country" value={country} onChangeText={setCountry} containerStyle={styles.halfField} />
        </View>

        <TextField label="Timezone" value={timezone} onChangeText={setTimezone} placeholder="Asia/Kolkata" />

        <View style={styles.rowFields}>
          <TextField label="Locale" value={locale} onChangeText={setLocale} autoCapitalize="none" containerStyle={styles.halfField} />
          <TextField
            label="Currency"
            value={currency}
            onChangeText={setCurrency}
            autoCapitalize="characters"
            maxLength={3}
            containerStyle={styles.halfField}
          />
        </View>

        <TextField
          label="Bio"
          value={bio}
          onChangeText={setBio}
          multiline
          placeholder="A short profile description"
          style={styles.bioInput}
        />
      </Card>

      <Card variant="muted" style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>PROFILE SETTINGS</Text>

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrap}>
            <Text style={styles.toggleTitle}>Push Notifications</Text>
            <Text style={styles.toggleSubtitle}>Transaction and reminder alerts on this profile.</Text>
          </View>
          <Switch
            value={pushNotificationsEnabled}
            onValueChange={setPushNotificationsEnabled}
            trackColor={{ false: theme.color.borderStrong, true: theme.color.actionPrimary }}
            thumbColor={theme.color.surface}
          />
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrap}>
            <Text style={styles.toggleTitle}>Email Notifications</Text>
            <Text style={styles.toggleSubtitle}>Receive security and account activity emails.</Text>
          </View>
          <Switch
            value={emailNotificationsEnabled}
            onValueChange={setEmailNotificationsEnabled}
            trackColor={{ false: theme.color.borderStrong, true: theme.color.actionPrimary }}
            thumbColor={theme.color.surface}
          />
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrap}>
            <Text style={styles.toggleTitle}>Weekly Summary</Text>
            <Text style={styles.toggleSubtitle}>Get a weekly spend digest for this profile.</Text>
          </View>
          <Switch
            value={weeklySummaryEnabled}
            onValueChange={setWeeklySummaryEnabled}
            trackColor={{ false: theme.color.borderStrong, true: theme.color.actionPrimary }}
            thumbColor={theme.color.surface}
          />
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrap}>
            <Text style={styles.toggleTitle}>Biometric Lock</Text>
            <Text style={styles.toggleSubtitle}>Require biometrics before app access on this device.</Text>
          </View>
          <Switch
            value={biometricsEnabled}
            onValueChange={setBiometricsEnabled}
            trackColor={{ false: theme.color.borderStrong, true: theme.color.actionPrimary }}
            thumbColor={theme.color.surface}
          />
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrap}>
            <Text style={styles.toggleTitle}>Product Updates</Text>
            <Text style={styles.toggleSubtitle}>Receive feature announcements and onboarding tips.</Text>
          </View>
          <Switch
            value={marketingOptIn}
            onValueChange={setMarketingOptIn}
            trackColor={{ false: theme.color.borderStrong, true: theme.color.actionPrimary }}
            thumbColor={theme.color.surface}
          />
        </View>
      </Card>

      <View style={styles.actionRow}>
        <Button label="Back" variant="ghost" onPress={onBack} style={styles.actionButton} disabled={saving} />
        <Button
          label="Save Profile"
          variant="primary"
          loading={saving}
          disabled={uploadingAvatar || removingAvatar}
          onPress={() => void handleSave()}
          style={styles.actionButton}
        />
      </View>
    </Screen>
  );
};

const styles = createStyles(() => ({
  profileCard: {
    gap: theme.spacing.lg
  },
  sectionCard: {
    gap: theme.spacing.md
  },
  sectionTitle: {
    color: theme.color.textPrimary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5
  },
  profileHeaderRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    alignItems: "center"
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.color.borderStrong,
    backgroundColor: theme.color.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  avatarImage: {
    width: "100%",
    height: "100%"
  },
  avatarFallbackText: {
    color: theme.color.textPrimary,
    fontSize: theme.typography.heading,
    fontWeight: "800",
    letterSpacing: 0.3
  },
  profileMeta: {
    flex: 1,
    gap: 2
  },
  profileName: {
    color: theme.color.textPrimary,
    fontSize: theme.typography.heading,
    fontWeight: "700"
  },
  profileEmail: {
    color: theme.color.textMuted,
    fontSize: theme.typography.bodySmall,
    fontWeight: "600"
  },
  avatarActionRow: {
    flexDirection: "row",
    gap: theme.spacing.md
  },
  avatarActionButton: {
    flex: 1,
    minHeight: 46
  },
  rowFields: {
    flexDirection: "row",
    gap: theme.spacing.md
  },
  halfField: {
    flex: 1
  },
  bioInput: {
    minHeight: 92,
    textAlignVertical: "top"
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.borderSubtle
  },
  toggleTextWrap: {
    flex: 1,
    gap: 2
  },
  toggleTitle: {
    color: theme.color.textPrimary,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  toggleSubtitle: {
    color: theme.color.textSecondary,
    fontSize: theme.typography.caption,
    fontWeight: "500"
  },
  actionRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl
  },
  actionButton: {
    flex: 1
  }
}));
