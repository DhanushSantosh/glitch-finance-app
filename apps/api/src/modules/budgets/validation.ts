import { z } from "zod";

const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

export const budgetMonthSchema = z.string().regex(monthRegex, "Month must be in YYYY-MM format.");

export const budgetCreateSchema = z.object({
  categoryId: z.string().uuid(),
  month: budgetMonthSchema,
  amount: z.coerce.number().positive().finite(),
  currency: z.string().length(3).optional()
});

export const budgetUpdateSchema = z
  .object({
    categoryId: z.string().uuid().optional(),
    month: budgetMonthSchema.optional(),
    amount: z.coerce.number().positive().finite().optional(),
    currency: z.string().length(3).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required."
  });

export const budgetListQuerySchema = z.object({
  month: budgetMonthSchema.optional()
});

export const idParamSchema = z.object({
  id: z.string().uuid()
});

export const getCurrentMonthToken = (): string => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export const getMonthWindow = (monthToken: string): { start: Date; end: Date } => {
  const [yearRaw, monthRaw] = monthToken.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));

  return { start, end };
};
