import { z } from "zod";

export const goalCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  targetAmount: z.coerce.number().positive().finite(),
  currentAmount: z.coerce.number().nonnegative().finite().default(0),
  currency: z.string().length(3).optional(),
  targetDate: z.coerce.date().optional()
});

export const goalUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    targetAmount: z.coerce.number().positive().finite().optional(),
    currentAmount: z.coerce.number().nonnegative().finite().optional(),
    currency: z.string().length(3).optional(),
    targetDate: z.coerce.date().nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required."
  });

export const idParamSchema = z.object({
  id: z.string().uuid()
});
