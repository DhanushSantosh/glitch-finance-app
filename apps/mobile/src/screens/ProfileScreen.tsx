import { useMemo, useState } from "react";
import { Image, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { AppHeader, Button, Card, publishToast, Screen, TextField } from "../components/ui";
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
  occupation: string;
  bio: string;
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
  
  const [occupation, setOccupation] = useState(profile.occupation ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);

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
    setUploadingAvatar(true);

    try {
      const preparedFile = await prepareAvatarForUpload(uri);
      const uploadedUrl = await onUploadAvatar(preparedFile);
      setAvatarUrl(uploadedUrl);
      publishToast({
        tone: "success",
        title: "Profile picture",
        message: "Profile picture updated."
      });
    } catch (uploadError) {
      publishToast({
        tone: "error",
        title: "Profile picture",
        message: uploadError instanceof Error ? uploadError.message : "Unable to upload profile picture right now."
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChooseFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        publishToast({
          tone: "warn",
          title: "Gallery permission",
          message: "Gallery permission is required to choose a profile picture."
        });
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
    } catch (pickerError) {
      publishToast({
        tone: "error",
        title: "Profile picture",
        message: pickerError instanceof Error ? pickerError.message : "Unable to open gallery right now."
      });
    }
  };

  const handleChooseFromFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
        multiple: false
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      await uploadAvatarFromUri(result.assets[0].uri);
    } catch (pickerError) {
      publishToast({
        tone: "error",
        title: "Profile picture",
        message: pickerError instanceof Error ? pickerError.message : "Unable to open files right now."
      });
    }
  };

  const handleRemoveAvatar = async () => {
    setRemovingAvatar(true);

    try {
      await onRemoveAvatar();
      setAvatarUrl("");
      publishToast({
        tone: "success",
        title: "Profile picture",
        message: "Profile picture removed."
      });
    } catch (removeError) {
      publishToast({
        tone: "error",
        title: "Profile picture",
        message: removeError instanceof Error ? removeError.message : "Unable to remove profile picture right now."
      });
    } finally {
      setRemovingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (dateOfBirth.trim().length > 0 && !isValidDateOnly(dateOfBirth.trim())) {
      publishToast({
        tone: "error",
        title: "Profile",
        message: "Date of birth must be in YYYY-MM-DD format."
      });
      return;
    }

    setSaving(true);

    try {
      await onSave({
        firstName,
        lastName,
        displayName,
        phoneNumber,
        dateOfBirth: dateOfBirth.trim().length > 0 ? dateOfBirth.trim() : null,
        occupation,
        bio
      });
    } catch (saveError) {
      publishToast({
        tone: "error",
        title: "Profile",
        message: saveError instanceof Error ? saveError.message : "Unable to save profile right now."
      });
    } finally {
      setSaving(false);
    }
  };

  const avatarActionBusy = uploadingAvatar || removingAvatar || saving;

  return (
    <Screen keyboardAware>
      <AppHeader title="Your Profile" subtitle="Identity and personalized app settings." />

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
        
        <TextField
          label="Bio"
          value={bio}
          onChangeText={setBio}
          multiline
          placeholder="A short profile description"
          style={styles.bioInput}
        />
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
    gap: theme.spacing.md,
    zIndex: 2, // Ensure select dropdown goes over elements below
  },
  halfField: {
    flex: 1
  },
  bioInput: {
    minHeight: 92,
    textAlignVertical: "top"
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
