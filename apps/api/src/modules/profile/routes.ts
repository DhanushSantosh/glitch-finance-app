import multipart from "@fastify/multipart";
import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { access, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { eq } from "drizzle-orm";
import { FastifyInstance, FastifyRequest } from "fastify";
import { AppContext } from "../../context.js";
import { userProfiles, users } from "../../db/schema.js";
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

const avatarStorageDirectory = path.resolve(process.cwd(), "storage", "avatars");
const maxAvatarFileSizeBytes = 5 * 1024 * 1024;
const avatarRoutePrefix = "/api/v1/profile/avatar/";
const avatarKeyPattern = /^[a-zA-Z0-9._-]{10,220}$/;

const mimeTypeToExtension: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

const extensionToMimeType: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
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

const ensureAvatarDirectory = async (): Promise<void> => {
  await mkdir(avatarStorageDirectory, { recursive: true });
};

const resolveAvatarFilePath = (avatarKey: string): string => path.join(avatarStorageDirectory, avatarKey);

const extractAvatarKeyFromUrl = (avatarUrl: string | null): string | null => {
  if (!avatarUrl) {
    return null;
  }

  let pathname = avatarUrl;
  try {
    pathname = new URL(avatarUrl).pathname;
  } catch {
    // Keep raw value when avatarUrl is already a path-like string.
  }

  const markerIndex = pathname.indexOf(avatarRoutePrefix);
  if (markerIndex < 0) {
    return null;
  }

  const key = pathname.slice(markerIndex + avatarRoutePrefix.length).split("/")[0] ?? "";

  if (!avatarKeyPattern.test(key)) {
    return null;
  }

  return key;
};

const deleteAvatarFileIfExists = async (avatarKey: string): Promise<void> => {
  const avatarPath = resolveAvatarFilePath(avatarKey);
  try {
    await unlink(avatarPath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT") {
      return;
    }
    throw error;
  }
};

const buildAvatarPublicUrl = (request: FastifyRequest, avatarKey: string): string => {
  const forwardedProtoHeader = request.headers["x-forwarded-proto"];
  const forwardedHostHeader = request.headers["x-forwarded-host"];

  const protocol =
    (typeof forwardedProtoHeader === "string" && forwardedProtoHeader.split(",")[0]?.trim()) ||
    request.protocol ||
    "http";

  const host =
    (typeof forwardedHostHeader === "string" && forwardedHostHeader.split(",")[0]?.trim()) ||
    request.headers.host ||
    "localhost:4000";

  return `${protocol}://${host}${avatarRoutePrefix}${avatarKey}`;
};

const updateAvatarUrl = async (ctx: AppContext, userId: string, avatarUrl: string | null): Promise<void> => {
  await ctx.db
    .update(userProfiles)
    .set({
      avatarUrl,
      updatedAt: new Date()
    })
    .where(eq(userProfiles.userId, userId));
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

    const avatarPath = resolveAvatarFilePath(key);
    const extension = path.extname(key).toLowerCase();
    const mimeType = extensionToMimeType[extension] ?? "application/octet-stream";

    try {
      await access(avatarPath);
    } catch {
      throw new AppError(404, "AVATAR_NOT_FOUND", "Avatar not found.");
    }

    const stream = createReadStream(avatarPath);
    reply.header("cache-control", "public, max-age=3600");
    reply.type(mimeType);
    // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write
    // Streaming a server-side file (avatar image), not user-controlled HTML content.
    return reply.send(stream);
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

    const existingProfile = await loadUserProfile(ctx, identity.userId);
    const previousAvatarKey = extractAvatarKeyFromUrl(existingProfile.avatarUrl);

    let avatarKey: string | null = null;

    try {
      const file = await request.file();
      if (!file) {
        throw new AppError(400, "AVATAR_FILE_REQUIRED", "Select an image file to upload.");
      }

      const extension = mimeTypeToExtension[file.mimetype];
      if (!extension) {
        throw new AppError(400, "INVALID_AVATAR_FILE_TYPE", "Only JPEG, PNG, or WEBP images are supported.");
      }

      avatarKey = `${identity.userId}-${Date.now()}-${randomUUID()}.${extension}`;
      await ensureAvatarDirectory();

      const destinationPath = resolveAvatarFilePath(avatarKey);
      await pipeline(file.file, createWriteStream(destinationPath));

      const avatarUrl = buildAvatarPublicUrl(request, avatarKey);
      await updateAvatarUrl(ctx, identity.userId, avatarUrl);

      if (previousAvatarKey && previousAvatarKey !== avatarKey) {
        try {
          await deleteAvatarFileIfExists(previousAvatarKey);
        } catch (error) {
          request.log.warn({ error, previousAvatarKey }, "Unable to delete previous avatar file.");
        }
      }

      await ctx.auditService.log({
        userId: identity.userId,
        action: "profile.avatar_upload",
        entityType: "user_profile",
        entityId: identity.userId,
        metadata: {
          avatarKey,
          mimeType: file.mimetype
        },
        requestId: request.id,
        ipAddress: request.ip
      });

      const updatedProfile = await loadUserProfile(ctx, identity.userId);
      return { item: toApiProfile(updatedProfile, profileDefaults) };
    } catch (error) {
      if (avatarKey) {
        try {
          await deleteAvatarFileIfExists(avatarKey);
        } catch (cleanupError) {
          request.log.warn({ cleanupError, avatarKey }, "Unable to clean up failed avatar upload file.");
        }
      }

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

        const existingProfile = await loadUserProfile(ctx, identity.userId);
        const previousAvatarKey = extractAvatarKeyFromUrl(existingProfile.avatarUrl);

        await updateAvatarUrl(ctx, identity.userId, null);

        if (previousAvatarKey) {
          try {
            await deleteAvatarFileIfExists(previousAvatarKey);
          } catch (error) {
            request.log.warn({ error, previousAvatarKey }, "Unable to delete avatar file while clearing profile picture.");
          }
        }

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

        if (hasOwn(body, "avatarUrl")) {
          updates.avatarUrl = toNullableText(body.avatarUrl);
          changedFields.push("avatarUrl");
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
