import { z } from "zod";

const dateOnlyPattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const validDateOnly = (value: string): boolean => {
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

const optionalTextField = (max: number) => z.string().trim().max(max).optional();

const optionalHttpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => value.length === 0 || /^https?:\/\//i.test(value), {
    message: "Avatar URL must start with http:// or https://."
  })
  .optional();

const profileSettingsPatchSchema = z
  .object({
    pushNotificationsEnabled: z.boolean().optional(),
    emailNotificationsEnabled: z.boolean().optional(),
    weeklySummaryEnabled: z.boolean().optional(),
    biometricsEnabled: z.boolean().optional(),
    marketingOptIn: z.boolean().optional()
  })
  .strict();

export const profileUpdateSchema = z
  .object({
    firstName: optionalTextField(80),
    lastName: optionalTextField(80),
    displayName: optionalTextField(120),
    phoneNumber: optionalTextField(24),
    dateOfBirth: z
      .union([z.string().trim().refine(validDateOnly, "Date of birth must be a valid YYYY-MM-DD value."), z.null()])
      .optional(),
    avatarUrl: optionalHttpUrl,
    city: optionalTextField(120),
    country: optionalTextField(120),
    timezone: optionalTextField(80),
    locale: optionalTextField(35),
    currency: optionalTextField(3),
    occupation: optionalTextField(120),
    bio: optionalTextField(280),
    settings: profileSettingsPatchSchema.optional()
  })
  .strict()
  .refine(
    (value) =>
      Object.keys(value).some((key) => {
        if (key !== "settings") {
          return true;
        }
        return value.settings !== undefined && Object.keys(value.settings).length > 0;
      }),
    {
      message: "At least one profile field is required."
    }
  );
