import { eq } from "drizzle-orm";
import { FastifyInstance } from "fastify";
import { AppContext } from "../../context.js";
import { userProfiles, users } from "../../db/schema.js";
import { AppError } from "../../errors.js";
import { requireAuth } from "../../utils/auth.js";
import { executeIdempotent } from "../../utils/idempotency.js";
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

const toNullableText = (value: string | undefined): string | null => {
  if (value === undefined) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const toApiProfile = (row: ProfileRow) => ({
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
  timezone: row.timezone ?? "UTC",
  locale: row.locale ?? "en-IN",
  currency: row.currency ?? "INR",
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

export const registerProfileRoutes = async (app: FastifyInstance, ctx: AppContext): Promise<void> => {
  app.get("/api/v1/profile", async (request) => {
    const identity = requireAuth(request);
    await ensureUserProfileRow(ctx, identity.userId);
    const profile = await loadUserProfile(ctx, identity.userId);
    return { item: toApiProfile(profile) };
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
          updates.timezone = body.timezone?.trim().length ? body.timezone.trim() : "UTC";
          changedFields.push("timezone");
        }

        if (hasOwn(body, "locale")) {
          updates.locale = body.locale?.trim().length ? body.locale.trim() : "en-IN";
          changedFields.push("locale");
        }

        if (hasOwn(body, "currency")) {
          const normalizedCurrency = body.currency?.trim().toUpperCase();
          updates.currency = normalizedCurrency && normalizedCurrency.length === 3 ? normalizedCurrency : "INR";
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
          item: toApiProfile(profile)
        };
      }
    });
  });
};
