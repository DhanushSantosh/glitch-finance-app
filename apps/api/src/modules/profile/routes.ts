import multipart from "@fastify/multipart";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { FastifyInstance } from "fastify";
import { AppContext } from "../../context.js";
import { avatarAssets, userProfiles, users } from "../../db/schema.js";
import { AppError } from "../../errors.js";
import { requireAuth } from "../../utils/auth.js";
import { executeIdempotent } from "../../utils/idempotency.js";
import {
  isSupportedCurrency,
  isSupportedLocale,
  isSupportedTimeZone,
  normalizeCurrency,
  normalizeLocale,
  normalizeTimeZone
} from "../../utils/regional.js";
import { parseOrThrow } from "../../utils/validation.js";
import { profileUpdateSchema } from "./validation.js";

type ProfileRow = {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  avatarUrl: string | null;
  city: string | null;
  country: string | null;
  timezone: string | null;
  locale: string | null;
  currency: string | null;
  occupation: string | null;
  bio: string | null;
  pushNotificationsEnabled: boolean | null;
  emailNotificationsEnabled: boolean | null;
  weeklySummaryEnabled: boolean | null;
  biometricsEnabled: boolean | null;
  marketingOptIn: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

const maxAvatarFileSizeBytes = 5 * 1024 * 1024;
const avatarRoutePrefix = "/api/v1/profile/avatar/";
const avatarKeyPattern = /^[a-zA-Z0-9._-]{10,220}$/;

const mimeTypeToExtension: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

const allowedMimeTypes = new Set(Object.keys(mimeTypeToExtension));

const inferImageMimeType = (buffer: Uint8Array): string | null => {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
};

const toNullableText = (value: string | undefined): string | null => {
  if (value === undefined) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const toApiProfile = (
  row: ProfileRow,
  defaults: {
    timezone: string;
    locale: string;
    currency: string;
  }
) => ({
  id: row.userId,
  email: row.email,
  firstName: row.firstName,
  lastName: row.lastName,
  displayName: row.displayName,
  phoneNumber: row.phoneNumber,
  dateOfBirth: row.dateOfBirth,
  avatarUrl: row.avatarUrl,
  city: row.city,
  country: row.country,
  timezone: normalizeTimeZone(row.timezone, defaults.timezone),
  locale: normalizeLocale(row.locale, defaults.locale),
  currency: normalizeCurrency(row.currency, defaults.currency),
  occupation: row.occupation,
  bio: row.bio,
  settings: {
    pushNotificationsEnabled: row.pushNotificationsEnabled ?? true,
    emailNotificationsEnabled: row.emailNotificationsEnabled ?? true,
    weeklySummaryEnabled: row.weeklySummaryEnabled ?? true,
    biometricsEnabled: row.biometricsEnabled ?? false,
    marketingOptIn: row.marketingOptIn ?? false
  },
  createdAt: row.createdAt?.toISOString() ?? null,
  updatedAt: row.updatedAt?.toISOString() ?? null
});

const ensureUserProfileRow = async (ctx: AppContext, userId: string): Promise<void> => {
  await ctx.db
    .insert(userProfiles)
    .values({
      userId,
      updatedAt: new Date()
    })
    .onConflictDoNothing();
};

const loadUserProfile = async (ctx: AppContext, userId: string): Promise<ProfileRow> => {
  const rows = await ctx.db
    .select({
      userId: users.id,
      email: users.email,
      firstName: userProfiles.firstName,
      lastName: userProfiles.lastName,
      displayName: userProfiles.displayName,
      phoneNumber: userProfiles.phoneNumber,
      dateOfBirth: userProfiles.dateOfBirth,
      avatarUrl: userProfiles.avatarUrl,
      city: userProfiles.city,
      country: userProfiles.country,
      timezone: userProfiles.timezone,
      locale: userProfiles.locale,
      currency: userProfiles.currency,
      occupation: userProfiles.occupation,
      bio: userProfiles.bio,
      pushNotificationsEnabled: userProfiles.pushNotificationsEnabled,
      emailNotificationsEnabled: userProfiles.emailNotificationsEnabled,
      weeklySummaryEnabled: userProfiles.weeklySummaryEnabled,
      biometricsEnabled: userProfiles.biometricsEnabled,
      marketingOptIn: userProfiles.marketingOptIn,
      createdAt: userProfiles.createdAt,
      updatedAt: userProfiles.updatedAt
    })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  const row = rows[0];

  if (!row) {
    throw new AppError(404, "USER_NOT_FOUND", "User account not found.");
  }

  return row;
};

const hasOwn = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);

const isFileTooLargeError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === "FST_REQ_FILE_TOO_LARGE" ||
    candidate.code === "FST_FILES_LIMIT" ||
    candidate.message?.toLowerCase().includes("file too large") === true
  );
};

const buildStoredAvatarPath = (avatarKey: string): string => `${avatarRoutePrefix}${avatarKey}`;

const updateAvatarUrl = async (ctx: AppContext, userId: string, avatarUrl: string | null): Promise<void> => {
  await ctx.db
    .update(userProfiles)
    .set({
      avatarUrl,
      updatedAt: new Date()
    })
    .where(eq(userProfiles.userId, userId));
};

const upsertAvatarAsset = async (
  ctx: AppContext,
  userId: string,
  avatarKey: string,
  mimeType: string,
  contentBase64: string
): Promise<void> => {
  await ctx.db
    .insert(avatarAssets)
    .values({
      userId,
      avatarKey,
      mimeType,
      contentBase64,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: avatarAssets.userId,
      set: {
        avatarKey,
        mimeType,
        contentBase64,
        updatedAt: new Date()
      }
    });
};

const deleteAvatarAssetIfExists = async (ctx: AppContext, userId: string): Promise<void> => {
  await ctx.db.delete(avatarAssets).where(eq(avatarAssets.userId, userId));
};

export const registerProfileRoutes = async (app: FastifyInstance, ctx: AppContext): Promise<void> => {
  const profileDefaults = {
    timezone: "UTC",
    locale: "en-IN",
    currency: ctx.env.APP_CURRENCY
  };

  await app.register(multipart, {
    attachFieldsToBody: false,
    limits: {
      files: 1,
      fileSize: maxAvatarFileSizeBytes
    }
  });

  app.get("/api/v1/profile/avatar/:key", async (request, reply) => {
    const params = request.params as { key?: string };
    const key = params.key ?? "";

    if (!avatarKeyPattern.test(key)) {
      throw new AppError(404, "AVATAR_NOT_FOUND", "Avatar not found.");
    }

    const rows = await ctx.db
      .select({
        mimeType: avatarAssets.mimeType,
        contentBase64: avatarAssets.contentBase64
      })
      .from(avatarAssets)
      .where(eq(avatarAssets.avatarKey, key))
      .limit(1);

    const avatar = rows[0];
    if (!avatar) {
      throw new AppError(404, "AVATAR_NOT_FOUND", "Avatar not found.");
    }

    // Validate against the server-side allowlist before setting Content-Type.
    // mimeType was inferred from magic bytes at upload time, but we re-verify here
    // to ensure only known image types are ever reflected into response headers.
    if (!allowedMimeTypes.has(avatar.mimeType)) {
      throw new AppError(404, "AVATAR_NOT_FOUND", "Avatar not found.");
    }

    reply.header("cache-control", "no-store");
    reply.header("x-content-type-options", "nosniff");
    reply.type(avatar.mimeType);
    return reply.send(Buffer.from(avatar.contentBase64, "base64"));
  });

  app.get("/api/v1/profile", async (request) => {
    const identity = requireAuth(request);
    await ensureUserProfileRow(ctx, identity.userId);
    const profile = await loadUserProfile(ctx, identity.userId);
    return { item: toApiProfile(profile, profileDefaults) };
  });

  app.post("/api/v1/profile/avatar", async (request) => {
    const identity = requireAuth(request);
    await ensureUserProfileRow(ctx, identity.userId);

    if (!request.isMultipart()) {
      throw new AppError(400, "AVATAR_FILE_REQUIRED", "Select an image file to upload.");
    }

    try {
      const file = await request.file();
      if (!file) {
        throw new AppError(400, "AVATAR_FILE_REQUIRED", "Select an image file to upload.");
      }

      const fileBuffer = await file.toBuffer();
      const detectedMimeType = inferImageMimeType(fileBuffer);
      if (!detectedMimeType) {
        throw new AppError(400, "INVALID_AVATAR_FILE_TYPE", "Only JPEG, PNG, or WEBP images are supported.");
      }
      const extension = mimeTypeToExtension[detectedMimeType];

      const avatarKey = `${identity.userId}-${Date.now()}-${randomUUID()}.${extension}`;
      await upsertAvatarAsset(ctx, identity.userId, avatarKey, detectedMimeType, fileBuffer.toString("base64"));
      await updateAvatarUrl(ctx, identity.userId, buildStoredAvatarPath(avatarKey));

      await ctx.auditService.log({
        userId: identity.userId,
        action: "profile.avatar_upload",
        entityType: "user_profile",
        entityId: identity.userId,
        metadata: {
          avatarKey,
          mimeType: detectedMimeType
        },
        requestId: request.id,
        ipAddress: request.ip
      });

      const updatedProfile = await loadUserProfile(ctx, identity.userId);
      return { item: toApiProfile(updatedProfile, profileDefaults) };
    } catch (error) {
      if (isFileTooLargeError(error)) {
        throw new AppError(413, "AVATAR_FILE_TOO_LARGE", `Avatar image must be under ${maxAvatarFileSizeBytes} bytes.`);
      }

      throw error;
    }
  });

  app.delete("/api/v1/profile/avatar", async (request, reply) => {
    const identity = requireAuth(request);

    return executeIdempotent({
      ctx,
      request,
      reply,
      userId: identity.userId,
      execute: async () => {
        await ensureUserProfileRow(ctx, identity.userId);

        await updateAvatarUrl(ctx, identity.userId, null);
        await deleteAvatarAssetIfExists(ctx, identity.userId);

        await ctx.auditService.log({
          userId: identity.userId,
          action: "profile.avatar_remove",
          entityType: "user_profile",
          entityId: identity.userId,
          requestId: request.id,
          ipAddress: request.ip
        });

        const updatedProfile = await loadUserProfile(ctx, identity.userId);
        return {
          item: toApiProfile(updatedProfile, profileDefaults)
        };
      }
    });
  });

  app.patch("/api/v1/profile", async (request, reply) => {
    const identity = requireAuth(request);

    return executeIdempotent({
      ctx,
      request,
      reply,
      userId: identity.userId,
      execute: async () => {
        const body = parseOrThrow(profileUpdateSchema, request.body);
        await ensureUserProfileRow(ctx, identity.userId);

        const updates: Partial<typeof userProfiles.$inferInsert> = {};
        const changedFields: string[] = [];

        if (hasOwn(body, "firstName")) {
          updates.firstName = toNullableText(body.firstName);
          changedFields.push("firstName");
        }

        if (hasOwn(body, "lastName")) {
          updates.lastName = toNullableText(body.lastName);
          changedFields.push("lastName");
        }

        if (hasOwn(body, "displayName")) {
          updates.displayName = toNullableText(body.displayName);
          changedFields.push("displayName");
        }

        if (hasOwn(body, "phoneNumber")) {
          updates.phoneNumber = toNullableText(body.phoneNumber);
          changedFields.push("phoneNumber");
        }

        if (hasOwn(body, "dateOfBirth")) {
          updates.dateOfBirth = body.dateOfBirth;
          changedFields.push("dateOfBirth");
        }

        if (hasOwn(body, "city")) {
          updates.city = toNullableText(body.city);
          changedFields.push("city");
        }

        if (hasOwn(body, "country")) {
          updates.country = toNullableText(body.country);
          changedFields.push("country");
        }

        if (hasOwn(body, "timezone")) {
          const nextTimezone = body.timezone?.trim();
          if (nextTimezone && !isSupportedTimeZone(nextTimezone)) {
            throw new AppError(400, "INVALID_TIMEZONE", "Timezone must be a valid IANA timezone.");
          }
          updates.timezone = nextTimezone?.length ? nextTimezone : profileDefaults.timezone;
          changedFields.push("timezone");
        }

        if (hasOwn(body, "locale")) {
          const nextLocale = body.locale?.trim();
          if (nextLocale && !isSupportedLocale(nextLocale)) {
            throw new AppError(400, "INVALID_LOCALE", "Locale must be a valid BCP 47 language tag.");
          }
          updates.locale = nextLocale?.length ? nextLocale : profileDefaults.locale;
          changedFields.push("locale");
        }

        if (hasOwn(body, "currency")) {
          const normalizedCurrency = body.currency?.trim().toUpperCase();
          if (normalizedCurrency && !isSupportedCurrency(normalizedCurrency)) {
            throw new AppError(400, "INVALID_CURRENCY", "Currency must be a supported 3-letter ISO code.");
          }
          updates.currency = normalizedCurrency?.length ? normalizedCurrency : profileDefaults.currency;
          changedFields.push("currency");
        }

        if (hasOwn(body, "occupation")) {
          updates.occupation = toNullableText(body.occupation);
          changedFields.push("occupation");
        }

        if (hasOwn(body, "bio")) {
          updates.bio = toNullableText(body.bio);
          changedFields.push("bio");
        }

        if (body.settings) {
          if (hasOwn(body.settings, "pushNotificationsEnabled")) {
            updates.pushNotificationsEnabled = body.settings.pushNotificationsEnabled;
            changedFields.push("settings.pushNotificationsEnabled");
          }

          if (hasOwn(body.settings, "emailNotificationsEnabled")) {
            updates.emailNotificationsEnabled = body.settings.emailNotificationsEnabled;
            changedFields.push("settings.emailNotificationsEnabled");
          }

          if (hasOwn(body.settings, "weeklySummaryEnabled")) {
            updates.weeklySummaryEnabled = body.settings.weeklySummaryEnabled;
            changedFields.push("settings.weeklySummaryEnabled");
          }

          if (hasOwn(body.settings, "biometricsEnabled")) {
            updates.biometricsEnabled = body.settings.biometricsEnabled;
            changedFields.push("settings.biometricsEnabled");
          }

          if (hasOwn(body.settings, "marketingOptIn")) {
            updates.marketingOptIn = body.settings.marketingOptIn;
            changedFields.push("settings.marketingOptIn");
          }
        }

        if (changedFields.length === 0) {
          throw new AppError(400, "VALIDATION_ERROR", "At least one profile field is required.");
        }

        updates.updatedAt = new Date();

        const updatedRows = await ctx.db
          .update(userProfiles)
          .set(updates)
          .where(eq(userProfiles.userId, identity.userId))
          .returning({ userId: userProfiles.userId });

        if (!updatedRows[0]) {
          throw new AppError(404, "PROFILE_NOT_FOUND", "Profile not found.");
        }

        await ctx.auditService.log({
          userId: identity.userId,
          action: "profile.update",
          entityType: "user_profile",
          entityId: identity.userId,
          metadata: {
            changedFields
          },
          requestId: request.id,
          ipAddress: request.ip
        });

        const profile = await loadUserProfile(ctx, identity.userId);
        return {
          item: toApiProfile(profile, profileDefaults)
        };
      }
    });
  });
};
